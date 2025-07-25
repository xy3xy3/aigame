import prisma from '~/server/utils/prisma';
import { InvitationStatus } from '@prisma/client';

export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string };
  const user = event.context.user;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const invitation = await prisma.invitation.findUnique({
    where: {
      id,
    },
  });

  if (!invitation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invitation not found',
    });
  }

  if (invitation.inviteeId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Invitation is not pending',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    await tx.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: invitation.inviteeId,
      },
    });
  });

  return {
    success: true,
  };
});