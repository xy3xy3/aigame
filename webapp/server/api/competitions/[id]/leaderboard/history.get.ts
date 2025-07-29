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
    const cachedData = await getCache<LeaderboardHistoryResponse>(cacheKey)
    if (cachedData) {
        return { ...cachedData, isCached: true }
    }

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

    // 4. 添加生成历史数据的任务到队列（如果需要）
    await addLeaderboardHistoryJob(competitionId, teamIds).catch(err => {
        console.error('Failed to add leaderboard history job:', err)
    })

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
            
            // 如果队伍没有历史数据，至少提供比赛开始和结束时间的0分数据点
            if (teamHistory.length === 0) {
                teamHistory.push(
                    {
                        timestamp: new Date(competition.startTime),
                        score: 0
                    },
                    {
                        timestamp: new Date(competition.endTime),
                        score: 0
                    }
                )
            }
            
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