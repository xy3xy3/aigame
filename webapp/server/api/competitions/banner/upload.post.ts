import multer from 'multer'
import { uploadFile } from '../../../utils/minio'
import { randomUUID } from 'crypto'

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allowed image types
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'))
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

    try {
        // Use multer to handle file upload
        const uploadMiddleware = upload.single('banner')

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
        const objectName = `banners/${randomUUID()}.${fileExtension}`

        await uploadFile('aigame', objectName, file.buffer, {
            'Content-Type': file.mimetype,
            'Original-Name': file.originalname,
            'Uploaded-By': user.id,
        })

        return {
            url: objectName,
        }
    } catch (error: any) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            throw createError({
                statusCode: 400,
                statusMessage: 'File too large (max 10MB)',
            })
        }
        throw error
    }
})