import multer from 'multer'
import { uploadFile, getPublicFileUrl } from '../../../../utils/minio'
import { randomUUID } from 'crypto'
import { requireAdminRole } from '../../../../utils/auth'

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
            'application/x-zip-compressed',
            'application/x-tar',
            'application/gzip',
            'application/x-gzip'
        ]

        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
        const allowedExtensions = ['.zip', '.tar', '.gz', '.tgz']

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true)
        } else {
            cb(new Error('Invalid file type. Only ZIP, TAR, and GZ files are allowed.'))
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
        const uploadMiddleware = upload.single('dataset')

        await new Promise((resolve, reject) => {
            uploadMiddleware(event.node.req as any, event.node.res as any, (err: any) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(null)
                }
            })
        })

        const file = (event.node.req as any).file
        if (!file) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No file uploaded',
            })
        }

        // Upload file to Minio
        const fileExtension = file.originalname.split('.').pop()
        const objectName = `problems/datasets/${randomUUID()}.${fileExtension}`

        await uploadFile('aigame', objectName, file.buffer, {
            'Content-Type': file.mimetype,
            'Original-Name': file.originalname,
            'Uploaded-By': user.id,
        })

        // 生成完整的公共URL
        const publicUrl = getPublicFileUrl('aigame', objectName)

        return {
            url: publicUrl,
        }
    } catch (error: any) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            throw createError({
                statusCode: 400,
                statusMessage: 'File too large (max 100MB)',
            })
        }
        throw error
    }
})
