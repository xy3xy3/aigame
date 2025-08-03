import multer from 'multer'
import { uploadFile, getPublicFileUrl } from '../../../utils/minio'
import { randomUUID } from 'crypto'
import { requireAdminRole } from '../../../utils/auth'
import prisma from '../../../utils/prisma'
import { load as loadYaml } from 'js-yaml'
import { Readable } from 'stream'
import unzipper from 'unzipper'

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allowed compressed file types
        const allowedTypes = [
            'application/zip',
            'application/x-zip-compressed'
        ]

        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
        const allowedExtensions = ['.zip']

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true)
        } else {
            cb(new Error('Invalid file type. Only ZIP files are allowed.'))
        }
    },
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'POST') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed',
        })
    }

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required',
        })
    }

    requireAdminRole(user)

    try {
        // Use multer to handle file upload
        const uploadMiddleware = upload.array('files')

        await new Promise((resolve, reject) => {
            uploadMiddleware(event.node.req as any, event.node.res as any, (err: any) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(null)
                }
            })
        })

        const files = (event.node.req as any).files
        console.log('Uploaded files:', files)
        console.log('Files type:', typeof files)
        console.log('Files length:', files?.length)

        if (!files || files.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No files uploaded',
            })
        }

        // Get form data from multer parsed body
        const body = (event.node.req as any).body
        console.log('Multer parsed body:', body)

        const competitionId = body?.competitionId
        const mode = body?.mode

        console.log('Competition ID:', competitionId)
        console.log('Mode:', mode)

        if (!competitionId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'competitionId is required',
            })
        }

        if (!mode || (mode !== 'create' && mode !== 'overwrite')) {
            throw createError({
                statusCode: 400,
                statusMessage: 'mode must be either "create" or "overwrite"',
            })
        }

        // Process each uploaded file
        const results = []
        for (const file of files) {
            console.log('Processing file:', file?.originalname)
            console.log('File buffer exists:', !!file?.buffer)
            console.log('File buffer length:', file?.buffer?.length)
            const result = await processProblemFile(file, competitionId, mode, user.id)
            results.push(result)
        }

        return {
            success: true,
            results
        }
    } catch (error: any) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            throw createError({
                statusCode: 400,
                statusMessage: 'File too large (max 100MB)',
            })
        }
        // Ensure all errors are properly formatted
        console.error('Caught error:', error)
        console.error('Error type:', typeof error)
        console.error('Error constructor:', error?.constructor?.name)
        console.error('Error message:', error?.message)
        console.error('Error message type:', typeof error?.message)

        if (error instanceof Error) {
            const errorMessage = String(error.message || 'An unexpected error occurred during file processing.')
            console.error('Using error message:', errorMessage)
            throw createError({
                statusCode: 500,
                statusMessage: errorMessage,
            })
        } else {
            throw createError({
                statusCode: 500,
                statusMessage: 'An unexpected error occurred during file processing.',
            })
        }
    }
})

async function processProblemFile(file: any, competitionId: string, mode: string, userId: string) {
    // Validate competition exists
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId }
    })

    if (!competition) {
        throw createError({
            statusCode: 400,
            statusMessage: `Competition with id ${competitionId} not found`,
        })
    }

    // Extract files from zip in memory
    const extractedFiles: Record<string, Buffer> = {}

    const bufferStream = new Readable()
    bufferStream.push(file.buffer)
    bufferStream.push(null)

    await new Promise<void>((resolve, reject) => {
        bufferStream
            .pipe(unzipper.Parse())
            .on('entry', (entry: any) => {
                const fileName = entry.path
                const type = entry.type // 'Directory' or 'File'

                if (type === 'File') {
                    const chunks: Buffer[] = []
                    entry.on('data', (chunk: Buffer) => {
                        chunks.push(chunk)
                    })
                    entry.on('end', () => {
                        extractedFiles[fileName] = Buffer.concat(chunks)
                    })
                } else {
                    entry.autodrain()
                }
            })
            .on('finish', () => {
                resolve()
            })
            .on('error', (error: any) => {
                reject(error)
            })
    })

    // Check required files exist
    if (!extractedFiles['problem.yml']) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing problem.yml in zip file',
        })
    }

    // Parse problem.yml
    let problemData: any
    if (!extractedFiles['problem.yml'] || !(extractedFiles['problem.yml'] instanceof Buffer)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid problem.yml file in zip',
        })
    }

    try {
        console.log('Parsing problem.yml, buffer length:', extractedFiles['problem.yml'].length)
        const yamlContent = extractedFiles['problem.yml'].toString('utf-8')
        console.log('YAML content:', yamlContent)

        problemData = loadYaml(yamlContent)
        console.log('Parsed YAML data:', problemData)
        console.log('YAML data type:', typeof problemData)
        console.log('YAML data constructor:', problemData?.constructor?.name)

        // Convert to plain object to avoid ERR_INVALID_ARG_TYPE
        if (problemData && typeof problemData === 'object') {
            problemData = JSON.parse(JSON.stringify(problemData))
            console.log('Converted problemData:', problemData)
        } else {
            throw new Error('YAML data is not an object')
        }
    } catch (error) {
        console.error('Error parsing YAML:', error)
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid problem.yml format: ' + (error instanceof Error ? error.message : 'Unknown error'),
        })
    }

    // Validate required fields in problem.yml
    console.log('Validating problemData fields...')
    console.log('problemData.title:', problemData.title, 'type:', typeof problemData.title)

    if (!problemData.title) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing title in problem.yml',
        })
    }

    console.log('problemData.startTime:', problemData.startTime, 'type:', typeof problemData.startTime)
    if (!problemData.startTime) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing startTime in problem.yml',
        })
    }

    console.log('problemData.endTime:', problemData.endTime, 'type:', typeof problemData.endTime)
    if (!problemData.endTime) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing endTime in problem.yml',
        })
    }

    // Validate time logic
    console.log('Creating date objects...')
    console.log('startTime value:', problemData.startTime)
    console.log('endTime value:', problemData.endTime)

    const start = new Date(problemData.startTime)
    const end = new Date(problemData.endTime)

    console.log('start date:', start)
    console.log('end date:', end)
    console.log('start time valid:', !isNaN(start.getTime()))
    console.log('end time valid:', !isNaN(end.getTime()))

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid date format in startTime or endTime',
        })
    }

    if (start >= end) {
        throw createError({
            statusCode: 400,
            statusMessage: 'endTime must be after startTime',
        })
    }

    // Check if problem exists (for overwrite mode)
    let existingProblem = null
    if (mode === 'overwrite') {
        existingProblem = await prisma.problem.findFirst({
            where: {
                title: problemData.title,
                competitionId: competitionId
            }
        })
    }

    // Upload judge.zip and data.zip to MinIO if they exist
    let judgingScriptUrl = null
    let datasetUrl = null

    if (extractedFiles['judge.zip']) {
        const objectName = `problems/scripts/${randomUUID()}.zip`
        await uploadFile('aigame', objectName, extractedFiles['judge.zip'], {
            'Content-Type': 'application/zip',
            'Original-Name': 'judge.zip',
            'Uploaded-By': userId,
        })
        judgingScriptUrl = getPublicFileUrl('aigame', objectName)
    }

    if (extractedFiles['data.zip']) {
        const objectName = `problems/datasets/${randomUUID()}.zip`
        await uploadFile('aigame', objectName, extractedFiles['data.zip'], {
            'Content-Type': 'application/zip',
            'Original-Name': 'data.zip',
            'Uploaded-By': userId,
        })
        datasetUrl = getPublicFileUrl('aigame', objectName)
    }

    // Prepare problem data for database
    const problemDbData = {
        title: problemData.title,
        shortDescription: problemData.shortDescription || '',
        detailedDescription: problemData.detailedDescription || '',
        competitionId: competitionId,
        datasetUrl: datasetUrl,
        judgingScriptUrl: judgingScriptUrl,
        startTime: new Date(problemData.startTime),
        endTime: new Date(problemData.endTime),
        score: problemData.score || null
    }

    // Create or update problem in database
    let problem
    if (existingProblem && mode === 'overwrite') {
        // Update existing problem
        problem = await prisma.problem.update({
            where: { id: existingProblem.id },
            data: problemDbData
        })
    } else {
        // Create new problem
        // Check for duplicate title in create mode
        if (mode === 'create') {
            const duplicateProblem = await prisma.problem.findFirst({
                where: {
                    title: problemData.title,
                    competitionId: competitionId
                }
            })

            if (duplicateProblem) {
                throw createError({
                    statusCode: 400,
                    statusMessage: `Problem with title "${problemData.title}" already exists in this competition`,
                })
            }
        }

        problem = await prisma.problem.create({
            data: problemDbData
        })
    }

    // Return a plain object to ensure it's serializable
    return {
        problemId: problem.id,
        title: problem.title,
        mode: existingProblem && mode === 'overwrite' ? 'updated' : 'created'
    }
}