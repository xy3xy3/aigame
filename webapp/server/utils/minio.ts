import { Client } from 'minio'

let minioClient: Client | null = null

export function getMinioClient(): Client {
  if (!minioClient) {
    const config = useRuntimeConfig()

    minioClient = new Client({
      endPoint: config.minioEndpoint,
      port: config.minioPort,
      useSSL: false,
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    })
  }

  return minioClient
}

export async function ensureBucketExists(bucketName: string): Promise<void> {
  const client = getMinioClient()
  const exists = await client.bucketExists(bucketName)

  if (!exists) {
    await client.makeBucket(bucketName, 'us-east-1')
  }
}

/**
 * 设置存储桶为公共读取权限
 * @param bucketName 存储桶名称
 */
export async function setBucketPublicRead(bucketName: string): Promise<void> {
  const client = getMinioClient()

  // 定义公共读取策略
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`]
      }
    ]
  }

  try {
    await client.setBucketPolicy(bucketName, JSON.stringify(policy))
    console.log(`✅ 成功设置存储桶 ${bucketName} 为公共读取权限`)
  } catch (error) {
    console.error(`❌ 设置存储桶 ${bucketName} 公共读取权限失败:`, error)
    throw error
  }
}

export async function uploadFile(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const client = getMinioClient()
    await ensureBucketExists(bucketName)

    console.log(`Uploading to MinIO: bucket=${bucketName}, object=${objectName}, size=${buffer.length}`)

    await client.putObject(bucketName, objectName, buffer, buffer.length, metadata)

    console.log(`Successfully uploaded to MinIO: bucket=${bucketName}, object=${objectName}`)
    return `${bucketName}/${objectName}`
  } catch (error) {
    console.error('MinIO upload error:', error)
    throw new Error(`Failed to upload file to MinIO: ${error.message}`)
  }
}

export async function downloadFile(
  bucketName: string,
  objectName: string
): Promise<Buffer> {
  const client = getMinioClient()
  const stream = await client.getObject(bucketName, objectName)

  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export async function getFileUrl(
  bucketName: string,
  objectName: string,
  expiry: number = 24 * 60 * 60 // 24 hours
): Promise<string> {
  const client = getMinioClient()
  return await client.presignedGetObject(bucketName, objectName, expiry)
}

export function getPublicFileUrl(
  bucketName: string,
  objectName: string
): string {
  const config = useRuntimeConfig()
  const baseUrl = config.minioPublicUrl

  // 确保baseUrl以http://或https://开头
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('MINIO_PUBLIC_URL must start with http:// or https://')
  }

  // 移除baseUrl末尾的斜杠（如果有的话）
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // 确保bucketName和objectName不以斜杠开头
  const cleanBucketName = bucketName.startsWith('/') ? bucketName.slice(1) : bucketName
  const cleanObjectName = objectName.startsWith('/') ? objectName.slice(1) : objectName

  // 构建完整的URL
  return `${cleanBaseUrl}/${cleanBucketName}/${cleanObjectName}`
}