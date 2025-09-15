import multer from 'multer'
import { uploadFile, getPublicFileUrl } from '../../../../utils/minio'
import { randomUUID } from 'crypto'
import { requireAdminRole } from '../../../../utils/auth'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/zip', 'application/x-zip-compressed']
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'))
    if (allowed.includes(file.mimetype) || ext === '.zip') return cb(null, true)
    cb(new Error('Invalid file type. Only ZIP files are allowed.'))
  }
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  requireAdminRole(user)

  const uploadMiddleware = upload.single('sample')
  await new Promise((resolve, reject) => {
    uploadMiddleware(event.node.req as any, event.node.res as any, (err: any) => (err ? reject(err) : resolve(null)))
  })

  const file = (event.node.req as any).file
  if (!file) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const objectName = `problems/samples/${randomUUID()}.zip`
  await uploadFile('aigame', objectName, file.buffer, {
    'Content-Type': 'application/zip',
    'Original-Name': file.originalname
  })

  return { url: getPublicFileUrl('aigame', objectName) }
})

