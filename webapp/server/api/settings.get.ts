import prisma from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    try {
        // 获取 title 和 copyright 这两个特定的配置项
        const configs = await prisma.config.findMany({
            where: {
                key: {
                    in: ['title', 'copyright']
                }
            }
        });

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