import { getMinioClient } from '~/server/utils/minio'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const submissionId = event.context.params?.id

  if (!submissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Submission ID is required'
    })
  }

  const { $prisma } = await usePrisma()
  const submission = await $prisma.submission.findUnique({
    where: { id: submissionId },
    select: { submissionUrl: true }
  })

  if (!submission || !submission.submissionUrl) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission or file path not found'
    })
  }

  const s3Path = submission.submissionUrl
  const [bucketName, ...objectNameParts] = s3Path.split('/')
  const objectName = objectNameParts.join('/')

  if (!bucketName || !objectName) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid S3 path in submission record'
    })
  }

  try {
    const minio = getMinioClient()
    // 生成一个有效期为 10 分钟的预签名 URL
    const presignedUrl = await minio.presignedGetObject(bucketName, objectName, 10 * 60)

    return sendRedirect(event, presignedUrl, 302)
  }
  catch (error) {
    console.error('Failed to generate presigned URL from MinIO:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate file download link'
    })
  }
})