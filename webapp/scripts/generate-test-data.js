import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start generating test data...');

    // 1. Clean up the database
    console.log('Cleaning up existing data...');
    await prisma.problemScore.deleteMany({});
    await prisma.leaderboardEntry.deleteMany({});
    await prisma.leaderboard.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.problem.deleteMany({});
    await prisma.teamMembership.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.competition.deleteMany({});
    // 保留现有admin用户，不删除
    await prisma.user.deleteMany({
        where: {
            username: { not: 'admin' }
        }
    });
    console.log('Existing data cleaned.');


    // 2. Create a Competition
    console.log('Creating competition...');

    // 获取现有的admin用户
    const adminUser = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    const competition = await prisma.competition.create({
        data: {
            title: '年度AI算法大赛',
            description: '一场激动人心的年度AI算法竞赛。',
            rules: '请遵守比赛规则。',
            startTime: new Date('2025-01-01T00:00:00Z'),
            endTime: new Date('2025-12-31T23:59:59Z'),
            createdBy: adminUser.id,
        },
    });
    console.log(`Competition "${competition.title}" created.`);

    // 3. Create Problems
    console.log('Creating problems...');
    const problems = [];
    for (let i = 1; i <= 15; i++) {
        const problem = await prisma.problem.create({
            data: {
                title: `题目 ${i}`,
                shortDescription: `这是题目 ${i} 的简短描述。`,
                detailedDescription: `这是题目 ${i} 的详细描述和要求。`,
                competitionId: competition.id,
                startTime: new Date('2025-01-01T00:00:00Z'),
                endTime: new Date('2025-12-31T23:59:59Z'),
                score: 100,
            },
        });
        problems.push(problem);
    }
    console.log(`${problems.length} problems created.`);

    // 4. Create Teams and Users
    console.log('Creating teams and users...');
    const teamNames = Array.from({ length: 3 }, (_, i) => `队伍${i + 1}`);
    const createdTeams = [];

    for (const teamName of teamNames) {
        const teamUsers = [];
        // Create 3 users for each team
        for (let i = 1; i <= 3; i++) {
            const user = await prisma.user.create({
                data: {
                    username: `${teamName.replace('队', '').toLowerCase()}_user${i}`,
                    email: `${teamName.replace('队', '').toLowerCase()}_user${i}@example.com`,
                    passwordHash: await bcrypt.hash('123456', 12),
                    realName: `${teamName}成员${i}`,
                    studentId: `${teamName.replace('队', '').toLowerCase()}_${i}_${Date.now()}`, // 确保学号唯一
                },
            });
            teamUsers.push(user);
        }

        // Create the team
        const team = await prisma.team.create({
            data: {
                name: teamName,
                description: `这是${teamName}的描述。`,
            },
        });

        // Create team memberships
        const teamMemberships = [];
        for (let i = 0; i < teamUsers.length; i++) {
            const membership = await prisma.teamMembership.create({
                data: {
                    teamId: team.id,
                    userId: teamUsers[i].id,
                    role: i === 0 ? 'CREATOR' : 'MEMBER', // First user is the creator
                },
            });
            teamMemberships.push(membership);
        }

        // Add team with memberships to createdTeams array
        createdTeams.push({
            ...team,
            members: teamMemberships.map((membership, index) => ({
                user: teamUsers[index],
                ...membership
            }))
        });

        console.log(`Team "${team.name}" and its ${teamUsers.length} members created.`);
    }

    // 5. Ensure each team has exactly 2 submissions
    console.log('Creating submissions...');
    // Create exactly 2 submissions for each of the 3 teams (total 6 submissions)
    let submissionCount = 0;
    for (let i = 0; i < 3; i++) {  // 3 teams
        for (let j = 0; j < 2; j++) {  // 2 submissions each
            // Select team by index
            const team = createdTeams[i];

            // Randomly select a user from the team
            const userIndex = Math.floor(Math.random() * team.members.length);
            const user = team.members[userIndex].user;

            // Randomly select a problem
            const problemIndex = Math.floor(Math.random() * problems.length);
            const problem = problems[problemIndex];

            // Generate a random score between 0 and 100
            const score = Math.floor(Math.random() * 101);

            await prisma.submission.create({
                data: {
                    problemId: problem.id,
                    competitionId: competition.id,
                    teamId: team.id,
                    userId: user.id,
                    submissionUrl: 's3://bucket/path/to/submission.zip',
                    status: 'COMPLETED',
                    score: score,
                    judgedAt: new Date(),
                },
            });

            submissionCount++;

            // Log progress every 2 submissions
            if (submissionCount % 2 === 0) {
                console.log(`Created ${submissionCount} submissions so far...`);
            }
        }
    }
    console.log('6 submissions created.');

    // 6. Generate leaderboard data
    console.log('Generating leaderboard data...');

    // Get all teams and problems for the competition
    const allTeams = createdTeams;
    const allProblems = problems;

    // Create a leaderboard for the competition
    const leaderboard = await prisma.leaderboard.create({
        data: {
            competitionId: competition.id,
            lastUpdated: new Date(),
        }
    });

    // Calculate team scores and create problem scores
    const teamScores = [];

    for (const team of allTeams) {
        let totalScore = 0;
        const problemScoresData = [];

        // For each problem, find the best submission for this team
        for (const problem of allProblems) {
            const bestSubmission = await prisma.submission.findFirst({
                where: {
                    teamId: team.id,
                    problemId: problem.id,
                    competitionId: competition.id
                },
                orderBy: {
                    score: 'desc'
                }
            });

            if (bestSubmission) {
                // Create a ProblemScore record
                const problemScore = await prisma.problemScore.create({
                    data: {
                        problemId: problem.id,
                        score: bestSubmission.score || 0,
                        createdAt: bestSubmission.createdAt,
                        bestSubmissionId: bestSubmission.id
                    }
                });

                problemScoresData.push({
                    id: problemScore.id,
                    score: bestSubmission.score || 0
                });

                totalScore += bestSubmission.score || 0;
            }
        }

        teamScores.push({
            teamId: team.id,
            totalScore: totalScore,
            problemScoresData: problemScoresData
        });
    }

    // Sort teams by total score in descending order
    teamScores.sort((a, b) => b.totalScore - a.totalScore);

    // Create leaderboard entries with ranks
    for (let i = 0; i < teamScores.length; i++) {
        const teamScore = teamScores[i];
        const rank = i + 1;

        // Create leaderboard entry
        const leaderboardEntry = await prisma.leaderboardEntry.create({
            data: {
                leaderboardId: leaderboard.id,
                rank: rank,
                teamId: teamScore.teamId,
                totalScore: teamScore.totalScore,
                problemScores: {
                    connect: teamScore.problemScoresData.map(ps => ({ id: ps.id }))
                }
            }
        });
    }

    console.log(`Leaderboard data generated for ${teamScores.length} teams.`);


    console.log('Test data generation finished successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });