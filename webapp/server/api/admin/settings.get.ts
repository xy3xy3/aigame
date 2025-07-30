import prisma from '~/server/utils/prisma';
import { requireAdminRole } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
    const user = event.context.user;
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required'
        });
    }

    // Check admin role
    requireAdminRole(user);

    try {
        // 获取所有配置项
        const configs = await prisma.config.findMany();

        // 将配置转换为对象格式
        const settings: Record<string, string> = {};
        configs.forEach(config => {
            settings[config.key] = config.value;
        });

        return {
            success: true,
            data: settings
        };
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch settings'
        });
    }
});