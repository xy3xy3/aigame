import { PrismaClient } from '@prisma/client'
import { Command } from 'commander'

// 初始化 Prisma 客户端
const prisma = new PrismaClient()

// 初始化 Commander
const program = new Command()

// 定义生成队伍得分历史数据点的函数
async function generateTeamHistoryData(
    competitionId: string,
    teamId: string
): Promise<Array<{ timestamp: Date; score: number }>> {
    // 1. 获取队伍的所有提交记录
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
    })

    // 2. 按时间顺序处理提交记录，生成数据点
    const historyData: Array<{ timestamp: Date; score: number }> = []
    const problemBestScores = new Map<string, number>() // 记录每个题目的最高分
    let currentTotalScore = 0 // 当前总分
    let lastDataPointTime: Date | null = null // 上一个数据点的时间

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

            // 记录数据点
            historyData.push({
                timestamp: submissionTime,
                score: currentTotalScore
            })

            // 更新上一个数据点的时间
            lastDataPointTime = submissionTime
        }
        // 如果距离上一个数据点的时间超过3小时，记录数据点（即使分数没有变化）
        else if (lastDataPointTime) {
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
        // 如果还没有数据点，记录第一个数据点
        else if (historyData.length === 0) {
            historyData.push({
                timestamp: submissionTime,
                score: currentTotalScore
            })

            // 更新上一个数据点的时间
            lastDataPointTime = submissionTime
        }
    }

    return historyData
}

// 为指定比赛生成所有队伍的历史数据
async function generateCompetitionHistory(competitionId: string): Promise<void> {
    console.log(`开始为比赛 ${competitionId} 生成排行榜历史数据...`)

    // 1. 验证比赛是否存在
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: { id: true, title: true }
    })

    if (!competition) {
        throw new Error(`比赛 ${competitionId} 不存在`)
    }

    console.log(`找到比赛: ${competition.title}`)

    // 2. 获取比赛中的所有队伍
    const teams = await prisma.team.findMany({
        where: {
            participatingIn: {
                has: competitionId
            }
        },
        select: {
            id: true,
            name: true
        }
    })

    console.log(`找到 ${teams.length} 支队伍`)

    // 3. 为每个队伍生成历史数据
    for (const [index, team] of teams.entries()) {
        console.log(`处理队伍 ${index + 1}/${teams.length}: ${team.name} (${team.id})`)

        try {
            // 生成队伍的历史数据
            const historyData = await generateTeamHistoryData(competitionId, team.id)

            // 删除该队伍已有的历史数据
            await prisma.leaderboardHistory.deleteMany({
                where: {
                    competitionId,
                    teamId: team.id
                }
            })

            // 存储新的历史数据
            for (const dataPoint of historyData) {
                await prisma.leaderboardHistory.create({
                    data: {
                        competitionId,
                        teamId: team.id,
                        timestamp: dataPoint.timestamp,
                        totalScore: dataPoint.score
                    }
                })
            }

            console.log(`  成功生成 ${historyData.length} 个历史数据点`)
        } catch (error) {
            console.error(`  处理队伍 ${team.name} 时出错:`, error)
        }
    }

    console.log(`完成为比赛 ${competitionId} 生成排行榜历史数据`)
}

// 为所有比赛生成历史数据
async function generateAllCompetitionsHistory(): Promise<void> {
    console.log('开始为所有比赛生成排行榜历史数据...')

    // 获取所有比赛
    const competitions = await prisma.competition.findMany({
        select: {
            id: true,
            title: true
        }
    })

    console.log(`找到 ${competitions.length} 个比赛`)

    // 为每个比赛生成历史数据
    for (const [index, competition] of competitions.entries()) {
        console.log(`处理比赛 ${index + 1}/${competitions.length}: ${competition.title} (${competition.id})`)

        try {
            await generateCompetitionHistory(competition.id)
        } catch (error) {
            console.error(`处理比赛 ${competition.title} 时出错:`, error)
        }
    }

    console.log('完成为所有比赛生成排行榜历史数据')
}

// 主函数
async function main() {
    program
        .name('generate-leaderboard-history')
        .description('为比赛生成排行榜历史数据')
        .option('-c, --competition <id>', '为指定比赛生成历史数据')
        .option('-a, --all', '为所有比赛生成历史数据')
        .parse()

    const options = program.opts()

    try {
        if (options.competition) {
            await generateCompetitionHistory(options.competition)
        } else if (options.all) {
            await generateAllCompetitionsHistory()
        } else {
            program.help()
        }
    } catch (error) {
        console.error('执行过程中发生错误:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// 执行主函数
main().catch((error) => {
    console.error('发生未捕获的错误:', error)
    process.exit(1)
})