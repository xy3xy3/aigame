import { Queue, Worker, Job } from 'bullmq'
import { getRedisClient } from '../utils/redis'
import prisma from '../utils/prisma'
import { generateTeamHistoryData } from '../api/competitions/[id]/leaderboard/history.get'

// 排行榜历史数据队列
let leaderboardHistoryQueue: Queue | null = null
let leaderboardHistoryWorker: Worker | null = null

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