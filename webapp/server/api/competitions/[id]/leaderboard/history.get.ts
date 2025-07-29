import prisma from '~/server/utils/prisma'
import { getCache, setCache } from '~/server/utils/redis'
import { processTeamAvatarUrl } from '~/server/utils/url'
import { addLeaderboardHistoryJob, generateTeamHistoryData } from '~/server/plugins/leaderboard-history'

// 定义返回给前端的数据结构
interface LeaderboardHistoryResponse {
    competition: {
        id: string
        title: string
        startTime: Date
        endTime: Date
    }
    teams: Array<{
        id: string
        name: string
        avatarUrl?: string
        history: Array<{
            timestamp: Date
            score: number
        }>
    }>
    isCached: boolean
}

export default defineEventHandler(async (event) => {
    const competitionId = getRouterParam(event, 'id')
    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Competition ID is required'
        })
    }

    // 缓存键
    const cacheKey = `leaderboard:history:${competitionId}:top50`

    // 1. 尝试从缓存中获取数据
    //暂时注释
    // const cachedData = await getCache<LeaderboardHistoryResponse>(cacheKey)
    // if (cachedData) {
    //     return { ...cachedData, isCached: true }
    // }

    // 2. 从数据库获取比赛信息
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true
        }
    })

    if (!competition) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Competition not found'
        })
    }

    // 3. 获取当前排行榜前50的队伍
    const leaderboardEntries = await prisma.leaderboardEntry.findMany({
        where: {
            leaderboard: {
                competitionId: competitionId
            }
        },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            rank: 'asc'
        },
        take: 50
    })

    const teamIds = leaderboardEntries.map(entry => entry.teamId)

    // 4. 检查是否有队伍缺少历史数据
    const existingHistoryTeamIds = await prisma.leaderboardHistory.findMany({
        where: {
            competitionId,
            teamId: { in: teamIds }
        },
        select: { teamId: true },
        distinct: ['teamId']
    }).then(records => records.map(r => r.teamId))

    const missingHistoryTeamIds = teamIds.filter(teamId => !existingHistoryTeamIds.includes(teamId))

    // 如果有队伍缺少历史数据，立即为缺失的队伍生成数据
    if (missingHistoryTeamIds.length > 0) {
        console.log(`Found ${missingHistoryTeamIds.length} teams missing history data:`, missingHistoryTeamIds)
        
        // 同步生成缺失队伍的历史数据，而不是异步队列
        for (const missingTeamId of missingHistoryTeamIds) {
            try {
                console.log(`Generating history data for missing team: ${missingTeamId}`)
                const historyData = await generateTeamHistoryData(competitionId, missingTeamId)
                
                // 删除现有历史数据（如果有）
                await prisma.leaderboardHistory.deleteMany({
                    where: {
                        competitionId,
                        teamId: missingTeamId
                    }
                })
                
                // 存储新的历史数据
                for (const dataPoint of historyData) {
                    if (dataPoint.timestamp && typeof dataPoint.score === 'number' && !isNaN(dataPoint.score)) {
                        await prisma.leaderboardHistory.create({
                            data: {
                                competitionId,
                                teamId: missingTeamId,
                                timestamp: dataPoint.timestamp,
                                totalScore: dataPoint.score
                            }
                        })
                    }
                }
                
                console.log(`Successfully generated history data for team ${missingTeamId}`)
            } catch (error) {
                console.error(`Failed to generate history data for team ${missingTeamId}:`, error)
            }
        }
        
        // 重新获取历史数据
        const updatedHistoryRecords = await prisma.leaderboardHistory.findMany({
            where: {
                competitionId,
                teamId: { in: teamIds }
            },
            orderBy: {
                timestamp: 'asc'
            }
        })
        
        // 更新teamHistoryMap
        for (const record of updatedHistoryRecords) {
            const teamHistory = teamHistoryMap.get(record.teamId)
            if (teamHistory && record.timestamp && typeof record.totalScore === 'number') {
                const timestamp = new Date(record.timestamp)
                if (!isNaN(timestamp.getTime())) {
                    teamHistory.push({
                        timestamp,
                        score: record.totalScore
                    })
                }
            }
        }
    }

    // 5. 从数据库获取历史数据
    const historyRecords = await prisma.leaderboardHistory.findMany({
        where: {
            competitionId,
            teamId: { in: teamIds }
        },
        orderBy: {
            timestamp: 'asc'
        }
    })

    // 6. 组织数据结构
    const teamHistoryMap = new Map<string, Array<{ timestamp: Date; score: number }>>()

    // 初始化每个队伍的历史数据数组
    for (const teamId of teamIds) {
        teamHistoryMap.set(teamId, [])
    }

    // 将历史记录按队伍分组
    for (const record of historyRecords) {
        const teamHistory = teamHistoryMap.get(record.teamId)
        if (teamHistory && record.timestamp && typeof record.totalScore === 'number') {
            // 确保时间戳有效
            const timestamp = new Date(record.timestamp)
            if (!isNaN(timestamp.getTime())) {
                teamHistory.push({
                    timestamp,
                    score: record.totalScore
                })
            } else {
                console.warn(`Invalid timestamp for record:`, record)
            }
        }
    }

    // 7. 构建响应数据
    const response: LeaderboardHistoryResponse = {
        competition: {
            id: competition.id,
            title: competition.title,
            startTime: competition.startTime,
            endTime: competition.endTime
        },
        teams: leaderboardEntries.map(entry => {
            const teamHistory = teamHistoryMap.get(entry.teamId) || []

            return {
                id: entry.team.id,
                name: entry.team.name,
                avatarUrl: processTeamAvatarUrl(entry.team.avatarUrl) ?? undefined,
                history: teamHistory
            }
        }),
        isCached: false
    }

    // 8. 存储到缓存（10分钟过期）
    await setCache(cacheKey, response, 600)

    return response
})