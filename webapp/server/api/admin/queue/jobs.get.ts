import { getJobs, getJobCount } from '../../../utils/queue-manager'
import { requireAdminRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    requireAdminRole(event.context.user)

    const query = getQuery(event)
    const types = (query.types as string)?.split(',') as ('waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused')[] || ['waiting', 'active']
    const page = Number(query.page || 1)
    const pageSize = Number(query.pageSize || 10)

    // Filter out 'paused' type for getJobCount as it's not supported
    const countableTypes = types.filter(type => type !== 'paused') as ('waiting' | 'active' | 'completed' | 'failed' | 'delayed')[];

    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    try {
        const [jobs, total] = await Promise.all([
            getJobs(types, start, end),
            getJobCount(countableTypes)
        ]);

        const totalPages = Math.ceil(total / pageSize);

        return {
            success: true,
            jobs,
            pagination: {
                page,
                limit: pageSize,
                total,
                totalPages
            }
        }
    }
    catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get queue jobs',
            data: (error as Error).message,
        })
    }
})