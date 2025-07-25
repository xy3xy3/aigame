import { z } from 'zod'
import multer from 'multer'
import { usePrisma } from '../../utils/prisma'
import { uploadFile } from '../../utils/minio'
import { excludePassword } from '../../utils/auth'

// 配置multer使用内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的图片类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持JPEG、PNG、GIF、WebP格式的图片') as any, false)
    }
  }
})

const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().max(20).optional(),
  studentId: z.string().max(50).optional(),
  realName: z.string().max(50).optional()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  try {
    // 使用multer处理文件上传
    const uploadMiddleware = upload.single('avatar')

    await new Promise((resolve, reject) => {
      uploadMiddleware(event.node.req as any, event.node.res as any, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(null)
        }
      })
    })

    const file = (event.node.req as any).file
    const body = await readBody(event)

    // 验证请求参数
    const { username, email, phoneNumber, studentId, realName } = updateUserSchema.parse(body)

    const { $prisma } = await usePrisma()

    // 准备更新数据
    const updateData: any = {}

    // 更新用户信息字段
    if (username !== undefined) {
      updateData.username = username
    }
    if (email !== undefined) {
      updateData.email = email
    }
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber
    }
    if (studentId !== undefined) {
      updateData.studentId = studentId
    }
    if (realName !== undefined) {
      updateData.realName = realName
    }

    // 如果上传了头像，则处理头像上传
    let avatarUrl = null
    if (file) {
      // 上传文件到MinIO
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.originalname}`
      const objectName = `avatars/users/${user.id}/${fileName}`

      const filePath = await uploadFile('avatars', objectName, file.buffer, {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname,
        'Uploaded-By': user.id
      })

      avatarUrl = `avatars/${objectName}`
      updateData.avatarUrl = avatarUrl
    }

    // 更新用户信息
    const updatedUser = await $prisma.user.update({
      where: { id: user.id },
      data: updateData
    })

    return {
      success: true,
      user: excludePassword(updatedUser)
    }

  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: error.issues
      })
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      throw createError({
        statusCode: 400,
        statusMessage: '头像文件太大 (最大5MB)'
      })
    }

    if (error.code === 'P2002') {
      // 唯一约束违反
      const field = error.meta?.target?.[0] || '字段'
      throw createError({
        statusCode: 400,
        statusMessage: `${field}已存在`
      })
    }

    // 如果是我们抛出的错误，直接重新抛出
    if (error.statusCode) {
      throw error
    }

    // 处理其他错误
    console.error('Update user error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user',
      data: error.message
    })
  }
})