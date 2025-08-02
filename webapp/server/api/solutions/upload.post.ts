import multer from 'multer'
import { z } from 'zod'
import { uploadFile } from '../../utils/minio'
import prisma from '../../utils/prisma'

// 配置multer使用内存存储
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB限制
    },
    fileFilter: (req, file, cb) => {
        // 只允许PDF文件格式
        const allowedTypes = ['application/pdf']

        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
        const allowedExtensions = ['.pdf']

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true)
        } else {
            cb(new Error('只接受PDF格式的文件') as any, false)
        }
    }
})

const solutionUploadSchema = z.object({
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
            uploadMiddleware(event.node.req as any, event.node.res as any, (err) => {
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
        const { competitionId, teamId } = solutionUploadSchema.parse(body)

        // 验证比赛是否存在
        const competition = await prisma.competition.findUnique({
            where: { id: competitionId }
        })

        if (!competition) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Competition not found'
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

        // 检查提交时间窗口（比赛结束后指定天数内）
        const now = new Date()
        const competitionEndTime = new Date(competition.endTime)
        const solutionDeadline = new Date(competitionEndTime.getTime() + competition.solutionSubmissionDeadlineDays * 24 * 60 * 60 * 1000)

        if (now < competitionEndTime) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Solutions can only be submitted after the competition ends'
            })
        }

        if (now > solutionDeadline) {
            // 格式化截止时间为本地时间显示
            const deadlineStr = solutionDeadline.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Shanghai'
            })

            throw createError({
                statusCode: 400,
                statusMessage: `Solution submission deadline has passed. Deadline was: ${deadlineStr} (${competition.solutionSubmissionDeadlineDays} days after competition end)`
            })
        }

        // 检查是否已存在题解（每队每比赛只能提交一个，支持覆盖）
        const existingSolution = await prisma.solution.findFirst({
            where: {
                competitionId: competitionId,
                teamId: teamId
            }
        })

        // 获取团队名称用于生成文件名
        const teamInfo = await prisma.team.findUnique({
            where: { id: teamId },
            select: { name: true }
        })

        if (!teamInfo) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Team not found'
            })
        }

        // 生成文件名：队伍名字_比赛名字.pdf
        const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.'))
        const generatedFileName = `${teamInfo.name}_${competition.title}${fileExtension}`

        // 清理文件名，只过滤HTTP头部不允许的字符：控制字符、换行符、回车符、制表符等
        // 保留中文字符和其他Unicode字符
        const cleanOriginalName = file.originalname.replace(/[\x00-\x1f\x7f\r\n\t]/g, '_')
        const cleanGeneratedName = generatedFileName.replace(/[\x00-\x1f\x7f\r\n\t]/g, '_')

        // 上传文件到MinIO
        const objectName = `solutions/${competitionId}/${teamId}/${cleanGeneratedName}`

        const metadata = {
            'Content-Type': file.mimetype,
            'Original-Name': cleanOriginalName,
            'Generated-Name': cleanGeneratedName,
            'Uploaded-By': user.id,
            'Team-Id': teamId,
            'Competition-Id': competitionId,
            'Upload-Timestamp': Date.now().toString()
        }

        const fileUrl = await uploadFile('aigame', objectName, file.buffer, metadata)

        // 创建或更新题解记录
        const solution = existingSolution
            ? await prisma.solution.update({
                where: { id: existingSolution.id },
                data: {
                    userId: user.id,
                    fileUrl: `aigame/${objectName}`,
                    fileName: file.originalname,
                    fileSize: file.size || file.buffer.length,
                    mimeType: file.mimetype,
                    updatedAt: new Date()
                },
                include: {
                    team: {
                        select: {
                            name: true
                        }
                    },
                    user: {
                        select: {
                            username: true
                        }
                    },
                    competition: {
                        select: {
                            title: true
                        }
                    }
                }
            })
            : await prisma.solution.create({
                data: {
                    competitionId,
                    teamId,
                    userId: user.id,
                    fileUrl: `aigame/${objectName}`,
                    fileName: file.originalname,
                    fileSize: file.size || file.buffer.length,
                    mimeType: file.mimetype
                },
                include: {
                    team: {
                        select: {
                            name: true
                        }
                    },
                    user: {
                        select: {
                            username: true
                        }
                    },
                    competition: {
                        select: {
                            title: true
                        }
                    }
                }
            })

        return {
            success: true,
            solution: {
                id: solution.id,
                fileName: solution.fileName,
                fileSize: solution.fileSize,
                mimeType: solution.mimeType,
                createdAt: solution.createdAt,
                updatedAt: solution.updatedAt,
                team: solution.team,
                user: solution.user,
                competition: solution.competition
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

        if (error.message === '只接受PDF格式的文件') {
            throw createError({
                statusCode: 400,
                statusMessage: error.message
            })
        }

        throw error
    }
})