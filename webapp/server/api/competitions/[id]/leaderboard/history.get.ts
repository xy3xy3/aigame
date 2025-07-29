import prisma from '~/server/utils/prisma'
import { getCache, setCache } from '~/server/utils/redis'
import { processTeamAvatarUrl } from '~/server/utils/url'

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
}

// 定义提交记录的数据结构
interface SubmissionRecord {
    id: string
    teamId: string
    problemId: string
    score: number
    submittedAt: Date
}

// 生成队伍得分历史数据点的函数
async function generateTeamHistoryData(
    competitionId: string,
    teamId: string
): Promise<Array<{ timestamp: Date; score: number }>> {
    // 1. 获取比赛信息
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: {
            startTime: true,
            endTime: true
        }
    })

    if (!competition) {
        throw new Error(`Competition with id ${competitionId} not found`)
    }

    // 2. 获取队伍的所有提交记录
    const submissions = await prisma.submission.findMany({
        where: {
            competitionId,
            teamId,
            status: 'COMPLETED',
            score: { not: null }
        },
        select: {
            id: true,
            problemId: true,
            score: true,
            submittedAt: true
        },
        orderBy: {
            submittedAt: 'asc'
        }
    })

    // 3. 初始化历史数据，添加初始零分点
    const historyData: Array<{ timestamp: Date; score: number }> = [{
        timestamp: competition.startTime,
        score: 0
    }]

    const problemBestScores = new Map<string, number>() // 记录每个题目的最高分
    let currentTotalScore = 0 // 当前总分
    let lastDataPointTime: Date = competition.startTime // 上一个数据点的时间，初始化为比赛开始时间

    // 4. 按时间顺序处理提交记录，生成数据点
    for (const submission of submissions) {
        const problemId = submission.problemId
        const newScore = submission.score!
        const submissionTime = submission.submittedAt

        // 获取该题目的当前最高分
        const currentProblemBest = problemBestScores.get(problemId) || 0

        // 如果这个提交在该题目上取得了新的最高分
        if (newScore > currentProblemBest) {
            // 更新该题目的最高分
            problemBestScores.set(problemId, newScore)

            // 更新总分（减去旧的分数，加上新的分数）
            currentTotalScore = currentTotalScore - currentProblemBest + newScore

            // 检查是否需要添加定时数据点（在新高分之前）
            const timeDiff = submissionTime.getTime() - lastDataPointTime.getTime()
            const threeHoursInMillis = 3 * 60 * 60 * 1000

            if (timeDiff >= threeHoursInMillis) {
                // 添加定时数据点（保持之前的分数）
                historyData.push({
                    timestamp: new Date(lastDataPointTime.getTime() + threeHoursInMillis),
                    score: historyData[historyData.length - 1].score
                })
            }

            // 记录新高分数据点
            historyData.push({
                timestamp: submissionTime,
                score: currentTotalScore
            })

            // 更新上一个数据点的时间
            lastDataPointTime = submissionTime
        }
        // 如果距离上一个数据点的时间超过3小时，记录数据点（即使分数没有变化）
        else {
            const timeDiff = submissionTime.getTime() - lastDataPointTime.getTime()
            const threeHoursInMillis = 3 * 60 * 60 * 1000

            if (timeDiff >= threeHoursInMillis) {
                historyData.push({
                    timestamp: submissionTime,
                    score: currentTotalScore
                })

                // 更新上一个数据点的时间
                lastDataPointTime = submissionTime
            }
        }
    }

    // 5. 如果最后一个数据点不是比赛结束时间，添加一个结束时间点
    if (lastDataPointTime < competition.endTime) {
        historyData.push({
            timestamp: competition.endTime,
            score: currentTotalScore
        })
    }

    return historyData
}

// 生成并存储历史数据的函数
async function generateAndStoreHistoryData(competitionId: string, teamIds: string[]): Promise<void> {
    // 为每个队伍生成历史数据并存储到数据库
    for (const teamId of teamIds) {
        // 生成队伍的历史数据
        const historyData = await generateTeamHistoryData(competitionId, teamId)

        // 删除该队伍已有的历史数据
        await prisma.leaderboardHistory.deleteMany({
            where: {
                competitionId,
                teamId
            }
        })

        // 存储新的历史数据
        for (const dataPoint of historyData) {
            await prisma.leaderboardHistory.create({
                data: {
                    competitionId,
                    teamId,
                    timestamp: dataPoint.timestamp,
                    totalScore: dataPoint.score
                }
            })
        }
    }
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
        return cachedData
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

    // 4. 生成并存储历史数据（如果需要）
    await generateAndStoreHistoryData(competitionId, teamIds)

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
        if (teamHistory) {
            teamHistory.push({
                timestamp: record.timestamp,
                score: record.totalScore
            })
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
        teams: leaderboardEntries.map(entry => ({
            id: entry.team.id,
            name: entry.team.name,
            avatarUrl: processTeamAvatarUrl(entry.team.avatarUrl) ?? undefined,
            history: teamHistoryMap.get(entry.teamId) || []
        }))
    }

    // 8. 存储到缓存（10分钟过期）
    await setCache(cacheKey, response, 600)

    return response
})