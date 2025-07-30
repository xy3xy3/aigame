import prisma from '~/server/utils/prisma'
import { getCache, setCache } from '~/server/utils/redis'
import { processTeamAvatarUrl } from '~/server/utils/url'

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
    });

    if (!competition) {
        throw new Error(`Competition with id ${competitionId} not found`);
    }

    // 2. 获取队伍的所有有效提交记录，并按时间排序
    const submissions = await prisma.submission.findMany({
        where: {
            competitionId,
            teamId,
            status: 'COMPLETED',
            score: { not: null }
        },
        select: {
            problemId: true,
            score: true,
            createdAt: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    // 3. 初始化历史数据，添加比赛开始时的零分点
    const historyData: Array<{ timestamp: Date; score: number }> = [{
        timestamp: new Date(competition.startTime),
        score: 0
    }];

    /**
     * 核心修复：辅助函数用于添加或更新历史数据点。
     * 这可以防止因同一毫秒内的多次提交而产生重复的时间戳，从而解决ECharts崩溃问题。
     * @param timestamp - 新数据点的时间戳
     * @param score - 新数据点的分数
     */
    const addOrUpdateHistoryPoint = (timestamp: Date, score: number) => {
        const lastPoint = historyData[historyData.length - 1];
        if (lastPoint && lastPoint.timestamp.getTime() === timestamp.getTime()) {
            // 如果时间戳与上一个点相同，则更新其分数，不添加新点
            lastPoint.score = score;
        } else if (!lastPoint || lastPoint.timestamp.getTime() < timestamp.getTime()) {
            // 只有当新点的时间戳晚于上一个点时才添加，确保数据严格按时间递增
            historyData.push({ timestamp, score });
        }
    };

    const problemBestScores = new Map<string, number>(); // 记录每个题目的最高分
    let currentTotalScore = 0; // 当前总分

    // 4. 按时间顺序处理所有提交记录，生成数据点
    for (const submission of submissions) {
        const problemId = submission.problemId;
        const newScore = submission.score!;
        const submissionTime = submission.createdAt;
        const currentProblemBest = problemBestScores.get(problemId) || 0;

        // 只有当提交的分数更高时，才更新总分
        if (newScore > currentProblemBest) {
            // 更新该题目的最高分
            problemBestScores.set(problemId, newScore);
            // 更新总分（减去旧的题目分数，加上新的题目分数）
            currentTotalScore = currentTotalScore - currentProblemBest + newScore;
        }

        // 为每一次有效提交都记录一个数据点（即使总分未变）
        // addOrUpdateHistoryPoint 会处理好时间戳重复的情况
        addOrUpdateHistoryPoint(submissionTime, currentTotalScore);
    }

    // 5. 确保历史数据总是包含比赛开始和适当的结束端点
    // 添加比赛开始时间点（如果还没有的话）
    if (historyData.length === 0 || historyData[0].timestamp.getTime() !== competition.startTime.getTime()) {
        historyData.unshift({
            timestamp: new Date(competition.startTime),
            score: 0
        });
    }

    // 添加结束时间点，使用min(比赛结束时间, 当前时间)
    const currentTime = new Date();
    const endTime = new Date(Math.min(competition.endTime.getTime(), currentTime.getTime()));
    const finalScore = historyData[historyData.length - 1]?.score ?? 0;

    if (historyData.length === 0 ||
        historyData[historyData.length - 1].timestamp.getTime() !== endTime.getTime()) {
        addOrUpdateHistoryPoint(endTime, finalScore);
    }

    return historyData;
}

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

    // 1. 尝试从缓存中获取数据（60秒缓存）
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

    // 4. 初始化数据结构
    const teamHistoryMap = new Map<string, Array<{ timestamp: Date; score: number }>>()

    // 初始化每个队伍的历史数据数组
    for (const teamId of teamIds) {
        teamHistoryMap.set(teamId, [])
    }

    // 5. 实时生成所有队伍的历史数据
    console.log(`Real-time generating history data for ${teamIds.length} teams`)

    // 为所有队伍实时生成历史数据
    for (const teamId of teamIds) {
        try {
            console.log(`Generating history data for team: ${teamId}`)
            const historyData = await generateTeamHistoryData(competitionId, teamId)

            // 直接使用生成的历史数据，不存储到数据库
            teamHistoryMap.set(teamId, historyData)

            console.log(`Successfully generated history data for team ${teamId}`)
        } catch (error) {
            console.error(`Failed to generate history data for team ${teamId}:`, error)
            // 如果生成失败，保持空数组
            teamHistoryMap.set(teamId, [])
        }
    }

    // 6. 构建响应数据
    // 使用min(比赛结束时间, 当前时间)作为有效的结束时间
    const currentTime = new Date()
    const effectiveEndTime = new Date(Math.min(competition.endTime.getTime(), currentTime.getTime()))

    const response: LeaderboardHistoryResponse = {
        competition: {
            id: competition.id,
            title: competition.title,
            startTime: competition.startTime,
            endTime: effectiveEndTime
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

    // 7. 存储到缓存（60秒过期）
    await setCache(cacheKey, response, 60)

    return response
})