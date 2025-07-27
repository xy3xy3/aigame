import multer from 'multer'
import { z } from 'zod'
import { uploadFile } from '../../utils/minio'
import prisma from '../../utils/prisma'
import { addEvaluationJob } from '../../utils/queue'

// 配置multer使用内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许ZIP文件
    const allowedTypes = [
      'application/zip',
      'application/x-zip-compressed'
    ]

    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))

    if (allowedTypes.includes(file.mimetype) || fileExtension === '.zip') {
      cb(null, true)
    } else {
      cb(new Error('只接受.zip格式的文件'), false)
    }
  }
})

const submitSchema = z.object({
  problemId: z.string(),
  competitionId: z.string(),
  teamId: z.string()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
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
    const uploadMiddleware = upload.single('file')

    await new Promise((resolve, reject) => {
      uploadMiddleware(event.node.req, event.node.res, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(null)
        }
      })
    })

    const file = (event.node.req as any).file
    const body = (event.node.req as any).body

    if (!file) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    // 验证请求参数
    const { problemId, competitionId, teamId } = submitSchema.parse(body)



    // 验证比赛和题目是否存在
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        competition: true
      }
    })

    if (!problem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Problem not found'
      })
    }

    if (problem.competitionId !== competitionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Problem does not belong to this competition'
      })
    }

    // 验证用户是否属于该队伍
    const teamMember = await prisma.teamMembership.findFirst({
      where: {
        teamId,
        userId: user.id
      },
      include: {
        team: true
      }
    })

    if (!teamMember) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You are not a member of this team'
      })
    }

    // 检查比赛和题目时间
    const now = new Date()

    if (problem.competition.startTime > now) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Competition has not started yet'
      })
    }

    if (problem.competition.endTime < now) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Competition has ended'
      })
    }

    if (problem.startTime > now) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Problem is not available yet'
      })
    }

    if (problem.endTime < now) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Problem submission deadline has passed'
      })
    }

    // 验证团队是否参加了比赛
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Team not found'
      })
    }

    if (!team.participatingIn.includes(competitionId)) {
      throw createError({
        statusCode: 400,
        statusMessage: '所选团队未参加此比赛'
      })
    }

    // 上传文件到MinIO
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.originalname}`
    const objectName = `submissions/${competitionId}/${problemId}/${teamId}/${fileName}`

    const submissionUrl = await uploadFile('submissions', objectName, file.buffer, {
      'Content-Type': file.mimetype,
      'Original-Name': file.originalname,
      'Uploaded-By': user.id,
      'Team-Id': teamId,
      'Problem-Id': problemId,
      'Competition-Id': competitionId
    })

    // 创建提交记录
    const submission = await prisma.submission.create({
      data: {
        problemId,
        competitionId,
        teamId,
        userId: user.id,
        submissionUrl: `submissions/${objectName}`,
        status: 'PENDING'
      },
      include: {
        problem: {
          select: {
            title: true
          }
        },
        team: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            username: true
          }
        }
      }
    })

    // 添加到评测队列
    await addEvaluationJob(submission.id)

    return {
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        problem: submission.problem,
        team: submission.team,
        user: submission.user
      }
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
        statusMessage: 'File too large (max 50MB)'
      })
    }

    if (error.message === '只接受.zip格式的文件') {
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    throw error
  }
})
