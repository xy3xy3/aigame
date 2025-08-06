import { clearAllCache } from '~/server/utils/redis'
import { requireAdminRole } from '../../../utils/auth'

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

    // Check admin role
    requireAdminRole(user)

    try {
        // 清除所有Redis缓存
        await clearAllCache()

        return {
            success: true,
            message: '所有Redis缓存已清除'
        }
    } catch (error: any) {
        console.error('清除Redis缓存失败:', error)
        throw createError({
            statusCode: 500,
            statusMessage: '清除缓存失败: ' + (error.message || '未知错误')
        })
    }
})