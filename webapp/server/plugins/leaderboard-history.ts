import { Queue, Worker, Job } from 'bullmq'
import { getRedisClient } from '../utils/redis'
import prisma from '../utils/prisma'

// 排行榜历史数据队列
let leaderboardHistoryQueue: Queue | null = null
let leaderboardHistoryWorker: Worker | null = null

// 生成队伍得分历史数据点的函数
export async function generateTeamHistoryData(
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
            submittedAt: true
        },
        orderBy: {
            submittedAt: 'asc'
        }
    });

    // 3. 初始化历史数据，添加比赛开始时的零分点
    const historyData: Array<{ timestamp: Date; score: number }> = [{
        timestamp: competition.startTime,
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
        const submissionTime = submission.submittedAt;
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

    // 5. 添加一个比赛结束时间点，确保图表延伸至比赛结束
    const finalScore = historyData[historyData.length - 1]?.score ?? 0;
    addOrUpdateHistoryPoint(competition.endTime, finalScore);

    return historyData;
}

export function getLeaderboardHistoryQueue(): Queue {
    if (!leaderboardHistoryQueue) {
        const redisConnection = getRedisClient()

        leaderboardHistoryQueue = new Queue('leaderboard-history', {
            connection: redisConnection,
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 5,
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        })
    }

    return leaderboardHistoryQueue
}

// 添加排行榜历史数据生成任务
export async function addLeaderboardHistoryJob(competitionId: string, teamIds: string[]): Promise<Job> {
    const queue = getLeaderboardHistoryQueue()

    return await queue.add('generate-history', {
        competitionId,
        teamIds
    }, {
        priority: 1,
        delay: 0,
        // 避免重复任务
        jobId: `history-${competitionId}`,
    })
}

export default async () => {
    // 获取环境变量
    const redisConnection = getRedisClient()

    // 创建 Worker 来处理排行榜历史数据队列
    leaderboardHistoryWorker = new Worker('leaderboard-history', async (job: Job) => {
        try {
            if (job.name === 'generate-history') {
                // 生成排行榜历史数据
                const { competitionId, teamIds } = job.data

                // 为每个队伍生成历史数据并存储到数据库
                for (const teamId of teamIds) {
                    try {
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

                        console.log(`Successfully generated history data for competition ${competitionId}, team ${teamId}`)
                    } catch (error: any) {
                        console.error(`Failed to generate history data for competition ${competitionId}, team ${teamId}:`, error)
                        // 继续处理其他队伍，不中断整个任务
                    }
                }

                console.log(`Successfully generated history data for competition ${competitionId}`)
            }

            return { success: true }
        } catch (error: any) {
            console.error(`Failed to generate leaderboard history:`, error)
            throw error
        }
    }, {
        connection: redisConnection,
        concurrency: 2, // 同时处理2个历史数据生成任务
    })

    leaderboardHistoryWorker.on('completed', (job) => {
        console.log(`Leaderboard history job ${job.id} completed`)
    })

    leaderboardHistoryWorker.on('failed', (job, err) => {
        console.error(`Leaderboard history job ${job?.id} failed:`, err)
    })

    console.log('Leaderboard history worker started')
}