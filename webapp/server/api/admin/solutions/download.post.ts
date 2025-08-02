import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import JSZip from 'jszip'
import prisma from '../../../utils/prisma'
import { requireAdminRole } from '../../../utils/auth'
import { getMinioClient, downloadFile } from '../../../utils/minio'

const downloadSolutionsSchema = z.object({
    solutionIds: z.array(z.string()).min(1, 'At least one solution ID is required'),
    filename: z.string().optional().default('solutions')
})

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required'
        })
    }

    // Check admin role
    requireAdminRole(user)

    try {
        const body = await readBody(event)
        const { solutionIds, filename } = downloadSolutionsSchema.parse(body)

        // 获取所有指定的题解
        const solutions = await prisma.solution.findMany({
            where: {
                id: {
                    in: solutionIds
                }
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
                competition: {
                    select: {
                        title: true
                    }
                },
                user: {
                    select: {
                        username: true
                    }
                }
            }
        })

        if (solutions.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: 'No solutions found'
            })
        }

        // 创建ZIP文件
        const zip = new JSZip()
        const minio = getMinioClient()

        // 下载每个题解文件并添加到ZIP
        for (const solution of solutions) {
            try {
                // 解析文件路径
                const s3Path = solution.fileUrl
                const [bucketName, ...objectNameParts] = s3Path.split('/')
                const objectName = objectNameParts.join('/')

                if (!bucketName || !objectName) {
                    console.error(`Invalid S3 path for solution ${solution.id}: ${s3Path}`)
                    continue
                }

                // 从MinIO下载文件
                const fileBuffer = await downloadFile(bucketName, objectName)

                // 创建有意义的文件夹结构和文件名
                const competitionName = solution.competition.title.replace(/[/\\?%*:|"<>]/g, '-')
                const problemTitle = solution.problem.title.replace(/[/\\?%*:|"<>]/g, '-')
                const teamName = solution.team.name.replace(/[/\\?%*:|"<>]/g, '-')

                // 获取文件扩展名
                const fileExtension = solution.fileName.substring(solution.fileName.lastIndexOf('.'))

                // 构建ZIP内的文件路径
                const zipPath = `${competitionName}/${problemTitle}/${teamName}_${solution.title.replace(/[/\\?%*:|"<>]/g, '-')}${fileExtension}`

                // 添加文件到ZIP
                zip.file(zipPath, fileBuffer)

                // 创建一个信息文件
                const infoContent = `题解信息
==================
题解标题: ${solution.title}
题解描述: ${solution.description || '无'}
比赛: ${solution.competition.title}
题目: ${solution.problem.title}
团队: ${solution.team.name}
提交者: ${solution.user.username}
提交时间: ${solution.createdAt.toISOString()}
文件名: ${solution.fileName}
文件大小: ${solution.fileSize} 字节
文件类型: ${solution.mimeType}
`
                zip.file(`${competitionName}/${problemTitle}/${teamName}_info.txt`, infoContent)

            } catch (error) {
                console.error(`Failed to download solution ${solution.id}:`, error)
                // 继续处理其他文件，不要因为一个文件失败而中断整个过程

                // 添加错误信息文件
                const errorMessage = error instanceof Error ? error.message : String(error)
                const errorContent = `下载失败
        ==================
        题解ID: ${solution.id}
        题解标题: ${solution.title}
        错误信息: ${errorMessage}
        时间: ${new Date().toISOString()}
        `
                const competitionName = solution.competition.title.replace(/[/\\?%*:|"<>]/g, '-')
                const problemTitle = solution.problem.title.replace(/[/\\?%*:|"<>]/g, '-')
                const teamName = solution.team.name.replace(/[/\\?%*:|"<>]/g, '-')

                zip.file(`${competitionName}/${problemTitle}/${teamName}_ERROR.txt`, errorContent)
            }
        }

        // 生成ZIP文件
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        })

        // 设置响应头
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        const zipFilename = `${filename}_${timestamp}.zip`

        setHeader(event, 'Content-Type', 'application/zip')
        setHeader(event, 'Content-Disposition', `attachment; filename="${zipFilename}"`)
        setHeader(event, 'Content-Length', zipBuffer.length)

        return zipBuffer

    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid request body',
                data: error.issues
            })
        }

        console.error('Failed to create solutions ZIP:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create ZIP file'
        })
    }
})