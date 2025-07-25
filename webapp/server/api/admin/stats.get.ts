import prisma from '~/lib/prisma';

export default defineEventHandler(async (event) => {
  const users = await prisma.user.count();
  const teams = await prisma.team.count();
  const competitions = await prisma.competition.count();
  const submissions = await prisma.submission.count();

  return {
    users,
    teams,
    competitions,
    submissions,
  };
});