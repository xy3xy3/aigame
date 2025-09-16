import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  // 1. 验证请求方法
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed',
    });
  }

  // 2. 验证用户身份 (保持现有身份验证逻辑)
  const user = event.context.user; // 依赖于 Nuxt Auth 或您自己的身份验证中间件
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    });
  }

  // 3. 获取并验证分页和筛选参数
  const query = getQuery(event);
  // 使用安全 parseInt，避免 NaN 错误
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;

  // 安全地处理problemId, competitionId, teamId和status
  const problemId = query.problemId as string | undefined;
  const competitionId = query.competitionId as string | undefined;
  const teamId = query.teamId as string | undefined;
  const status = query.status as string | undefined;


  // 4. 构建查询条件 (更安全，并处理未提供的参数)
  const where: any = {
    userId: user.id // 默认只显示用户自己的提交
  };

  if (problemId) {
    where.problemId = problemId;
  }
  if (competitionId) {
    where.competitionId = competitionId;
  }
  if (status) {
    where.status = status;
  }

  // 5. 处理 teamId 筛选条件
  if (teamId) {
    // 验证用户是否属于指定队伍 (使用 Prisma 查询)
    const teamMember = await prisma.teamMembership.findFirst({
      where: {
        teamId,
        userId: user.id,
      },
    });

    if (!teamMember) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You are not a member of this team',
      });
    }
    where.teamId = teamId; // 如果用户是该团队成员，则添加 teamId 条件
  } else {
    // 如果未提供 teamId，则仅显示用户自己所在队伍的提交
    const userTeams = await prisma.teamMembership.findMany({
      where: { userId: user.id },
      select: { teamId: true },
    });

    const teamIds = userTeams.map((tm) => tm.teamId);

    if (teamIds.length > 0) {
      where.teamId = { in: teamIds };
    } else {
      // 如果用户不属于任何队伍，返回空结果
      return {
        success: true,
        submissions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  // 6. 获取提交列表
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        evaluateNode: {
          select: { id: true, name: true, baseUrl: true }
        },
        problem: {
          select: {
            id: true,
            title: true,
            shortDescription: true
          }
        },
        competition: {
          select: {
            id: true,
            title: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.submission.count({ where })
  ])

  // 7. 返回分页结果
  return {
    success: true,
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
