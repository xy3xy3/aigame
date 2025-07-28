// MinIO存储桶初始化脚本
// 用于设置存储桶的公共读取权限

const minio = require('minio')

async function initMinio() {
    try {
        console.log('正在初始化MinIO存储桶...')

        // MinIO配置
        const minioConfig = {
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY || 'root',
            secretKey: process.env.MINIO_SECRET_KEY || 'password'
        }

        // 创建MinIO客户端
        const client = new minio.Client(minioConfig)

        // 测试连接
        console.log('测试MinIO连接...')
        const buckets = await client.listBuckets()
        console.log('✅ MinIO连接成功')
        console.log(`现有存储桶: ${buckets.map(b => b.name).join(', ')}`)

        // 定义需要设置为公共读取的存储桶
        const bucketsToMakePublic = ['aigame']

        // 确保存储桶存在并设置为公共读取
        for (const bucketName of bucketsToMakePublic) {
            try {
                console.log(`检查存储桶 ${bucketName} 是否存在...`)
                const exists = await client.bucketExists(bucketName)

                if (!exists) {
                    console.log(`创建存储桶 ${bucketName}...`)
                    await client.makeBucket(bucketName, 'us-east-1')
                }

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

                console.log(`设置存储桶 ${bucketName} 为公共读取权限...`)
                await client.setBucketPolicy(bucketName, JSON.stringify(policy))

                console.log(`✅ 存储桶 ${bucketName} 已设置为公共读取权限`)
            } catch (error) {
                console.error(`❌ 处理存储桶 ${bucketName} 时出错:`, error)
            }
        }

        console.log('✅ MinIO存储桶初始化完成')
    } catch (error) {
        console.error('❌ MinIO初始化失败:', error)
        process.exit(1)
    }
}

// 使脚本既可以作为独立程序运行，也可以被其他模块导入
if (require.main === module) {
    initMinio()
}

module.exports = { initMinio }