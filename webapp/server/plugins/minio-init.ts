import { defineNitroPlugin } from '#imports'
import { ensureBucketExists, setBucketPublicRead } from '../utils/minio'

export default defineNitroPlugin(async () => {
  // 只在服务器端运行
  if (process.server) {
    try {
      console.log('🚀 正在初始化MinIO存储桶...')

      // 使用统一的aigame存储桶
      const bucketName = 'aigame'

      try {
        console.log(`确保存储桶 ${bucketName} 存在...`)
        await ensureBucketExists(bucketName)

        console.log(`设置存储桶 ${bucketName} 为公共读取权限...`)
        await setBucketPublicRead(bucketName)

        console.log(`✅ 存储桶 ${bucketName} 已设置为公共读取权限`)
      } catch (error) {
        console.error(`❌ 处理存储桶 ${bucketName} 时出错:`, error)
      }

      console.log('✅ MinIO存储桶初始化完成')
    } catch (error) {
      console.error('❌ MinIO初始化失败:', error)
    }
  }
})