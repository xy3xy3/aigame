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
        // 获取请求体中的设置对象
        const settings = await readBody(event);

        // 验证请求体是否为对象
        if (typeof settings !== 'object' || settings === null) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid settings format. Expected an object.'
            });
        }

        // 使用 Prisma upsert 方法创建或更新每个设置
        const updatePromises = Object.entries(settings).map(([key, value]) => {
            return prisma.config.upsert({
                where: { key },
                update: { value: value as string },
                create: { key, value: value as string }
            });
        });

        // 等待所有更新操作完成
        await Promise.all(updatePromises);

        return {
            success: true,
            message: 'Settings updated successfully',
            updatedCount: Object.keys(settings).length
        };
    } catch (error) {
        console.error('Error updating settings:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update settings'
        });
    }
});