import { z } from 'zod'
import multer from 'multer'
import { usePrisma } from '../../../utils/prisma'
import { uploadFile } from '../../../utils/minio'
import { processTeamData } from '../../../utils/url'

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

const updateTeamSchema = z.object({
  description: z.string().max(500).optional()
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

  const teamId = getRouterParam(event, 'id')
  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team ID is required'
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
    const { description } = updateTeamSchema.parse(body)

    const { $prisma } = await usePrisma()

    // 获取团队信息并验证用户是否为队长
    const team = await $prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captain: true
      }
    })

    if (!team) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Team not found'
      })
    }

    // 检查用户是否为队长
    if (team.captainId !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: '只有队长可以更新团队信息'
      })
    }

    // 准备更新数据
    const updateData: any = {}

    // 如果提供了描述，则更新
    if (description !== undefined) {
      updateData.description = description
    }

    // 如果上传了头像，则处理头像上传
    let avatarUrl = null
    if (file) {
      // 上传文件到MinIO
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.originalname}`
      const objectName = `avatars/teams/${teamId}/${fileName}`

      const filePath = await uploadFile('avatars', objectName, file.buffer, {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname,
        'Uploaded-By': user.id,
        'Team-Id': teamId as string
      })

      avatarUrl = `avatars/${objectName}`
      updateData.avatarUrl = avatarUrl
    }

    // 更新团队信息
    const updatedTeam = await $prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        captain: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    })

    // 处理团队数据，包括头像URL
    const processedTeam = processTeamData(updatedTeam)

    return {
      success: true,
      team: processedTeam
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

    // 如果是我们抛出的错误，直接重新抛出
    if (error.statusCode) {
      throw error
    }

    // 处理其他错误
    console.error('Update team error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update team',
      data: error.message
    })
  }
})