import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start generating test data...');

    // 1. Clean up the database
    console.log('Cleaning up existing data...');
    await prisma.submission.deleteMany({});
    await prisma.problem.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.competition.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Existing data cleaned.');


    // 2. Create a Competition
    console.log('Creating competition...');
    const competition = await prisma.competition.create({
        data: {
            title: '年度AI算法大赛',
            description: '一场激动人心的年度AI算法竞赛。',
            rules: '请遵守比赛规则。',
            startTime: new Date('2025-01-01T00:00:00Z'),
            endTime: new Date('2025-12-31T23:59:59Z'),
            // In a real scenario, you might want a dedicated admin user
            // For this script, we'll create a temporary user as the creator
            creator: {
                create: {
                    username: 'admin',
                    email: 'admin.creator@example.com',
                    passwordHash: await bcrypt.hash('123456', 12),
                    role: 'admin',
                },
            },
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
    const teamNames = ['Alpha队', 'Beta队', 'Gamma队'];
    const createdTeams = [];

    for (const teamName of teamNames) {
        const teamUsers = [];
        // Create 3 users for each team
        for (let i = 1; i <= 10; i++) {
            const user = await prisma.user.create({
                data: {
                    username: `${teamName.replace('队', '').toLowerCase()}_user${i}`,
                    email: `${teamName.replace('队', '').toLowerCase()}_user${i}@example.com`,
                    passwordHash: await bcrypt.hash('123456', 12),
                    realName: `${teamName}成员${i}`,
                },
            });
            teamUsers.push(user);
        }

        // The first user created will be the captain
        const captain = teamUsers[0];

        const team = await prisma.team.create({
            data: {
                name: teamName,
                description: `这是${teamName}的描述。`,
                captainId: captain.id,
                members: {
                    create: teamUsers.map(user => ({
                        userId: user.id,
                    })),
                },
            },
            include: {
                members: {
                    include: {
                        user: true,
                    }
                }
            }
        });
        createdTeams.push(team);
        console.log(`Team "${team.name}" and its ${team.members.length} members created.`);
    }

    // 5. Create Submissions
    console.log('Creating submissions...');
    // Generate 500 submission records for testing pagination
    for (let i = 0; i < 500; i++) {
        // Randomly select a team
        const teamIndex = Math.floor(Math.random() * createdTeams.length);
        const team = createdTeams[teamIndex];

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

        // Log progress every 50 submissions
        if ((i + 1) % 50 === 0) {
            console.log(`Created ${i + 1} submissions so far...`);
        }
    }
    console.log('500 submissions created.');

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