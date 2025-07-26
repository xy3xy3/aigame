import prisma from '~/server/utils/prisma';
import { requireAdminRole } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    });
  }

  // Check admin role
  requireAdminRole(user);

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