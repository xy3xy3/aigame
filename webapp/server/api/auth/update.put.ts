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

  // 检查客户端连接状态
  if (event.node.res.writableEnded || event.node.res.destroyed) {
    console.warn('Client connection already closed')
    return
  }

  try {
    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection already closed before processing')
      return
    }

    // 使用multer处理文件上传
    const uploadMiddleware = upload.single('avatar')

    await new Promise((resolve, reject) => {
      uploadMiddleware(event.node.req as any, event.node.res as any, (err) => {
        if (err) {
          // 处理EPIPE错误
          if (err.code === 'EPIPE' || (err.message && err.message.includes('EPIPE'))) {
            console.warn('EPIPE error occurred during file upload:', err)
            // EPIPE错误通常是客户端断开连接导致的，不需要抛出错误
            resolve(null)
            return
          }
          reject(err)
        } else {
          resolve(null)
        }
      })
    })

    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection closed during file upload')
      return
    }

    const file = (event.node.req as any).file
    let body = {}

    // 解析非文件字段，避免重新读取整个请求体
    if ((event.node.req as any).body) {
      body = (event.node.req as any).body
    } else {
      // 如果multer没有解析body，尝试从查询参数或手动解析
      const formData = (event.node.req as any).body || {}
      // 将form-data中的非文件字段添加到body
      for (const [key, value] of Object.entries(formData)) {
        if (key !== 'avatar' && !file) { // avatar是文件字段
          (body as any)[key] = value
        }
      }
    }

    // 如果body仍然是空对象，尝试从查询参数获取
    if (Object.keys(body).length === 0) {
      body = getQuery(event)
    }

    // 验证请求参数
    const { username, email, phoneNumber, studentId, realName } = updateUserSchema.parse(body)

    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection closed before database operation')
      return
    }

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

    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection closed before file upload')
      return
    }

    // 如果上传了头像，则处理头像上传
    let avatarUrl = null
    if (file) {
      try {
        // 上传文件到MinIO
        const timestamp = Date.now()
        // 清理文件名，移除特殊字符
        const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileName = `${timestamp}-${cleanFileName}`
        const objectName = `avatars/users/${user.id}/${fileName}`

        // 确保文件大小参数正确
        const fileSize = file.size || file.buffer.length

        // 清理和验证元数据
        const metadata = {
          'Content-Type': file.mimetype,
          'Original-Name': cleanFileName,
          'Uploaded-By': user.id,
          'Upload-Timestamp': timestamp.toString()
        }

        console.log(`Uploading file: ${fileName}, size: ${fileSize}, user: ${user.id}`)

        const filePath = await uploadFile('avatars', objectName, file.buffer, metadata)

        avatarUrl = `avatars/${objectName}`
        updateData.avatarUrl = avatarUrl

        console.log(`File uploaded successfully: ${filePath}`)
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to upload avatar',
          data: uploadError.message
        })
      }
    }

    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection closed before user update')
      return
    }

    // 更新用户信息
    const updatedUser = await $prisma.user.update({
      where: { id: user.id },
      data: updateData
    })

    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection closed after user update')
      return {
        success: true,
        user: excludePassword(updatedUser)
      }
    }

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

    // 处理EPIPE错误（客户端断开连接）
    if (error.code === 'EPIPE' || (error.message && error.message.includes('EPIPE'))) {
      console.warn('EPIPE error occurred during user update:', error)
      // EPIPE错误通常是客户端断开连接导致的，不需要抛出错误
      // 检查连接状态，如果已关闭则正常返回
      if (event.node.res.writableEnded || event.node.res.destroyed) {
        console.warn('Client connection already closed, ignoring EPIPE error')
        return {
          success: true,
          message: 'Update completed but client disconnected'
        }
      }
      // 如果连接未关闭，仍然抛出错误
      throw createError({
        statusCode: 500,
        statusMessage: 'Connection error',
        data: 'Client disconnected during operation'
      })
    }

    // 处理其他错误
    console.error('Update user error:', error)
    // 检查客户端连接状态
    if (event.node.res.writableEnded || event.node.res.destroyed) {
      console.warn('Client connection closed during error handling')
      // 如果客户端已断开连接，记录错误但不抛出
      return {
        success: false,
        message: 'Operation failed and client disconnected'
      }
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user',
      data: error.message
    })
  }
})