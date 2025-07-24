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

export async function uploadFile(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  metadata?: Record<string, string>
): Promise<string> {
  const client = getMinioClient()
  await ensureBucketExists(bucketName)
  
  await client.putObject(bucketName, objectName, buffer, buffer.length, metadata)
  
  return `${bucketName}/${objectName}`
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