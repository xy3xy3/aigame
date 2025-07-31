import Redis from 'ioredis'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    const config = useRuntimeConfig()

    // 添加调试日志来验证配置
    console.log('Redis 配置调试信息:')
    console.log('- redisUrl:', config.redisUrl)
    console.log('- redisPassword:', config.redisPassword ? '[已设置]' : '[未设置/undefined]')
    console.log('- redisPassword 类型:', typeof config.redisPassword)
    console.log('- redisPassword 值:', config.redisPassword)

    redisClient = new Redis(config.redisUrl, {
      password: config.redisPassword,
      maxRetriesPerRequest: null, // BullMQ要求设置为null
    })

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err)
      console.error('连接失败时的配置信息:')
      console.error('- URL:', config.redisUrl)
      console.error('- Password:', config.redisPassword ? '已设置' : '未设置')
    })

    redisClient.on('connect', () => {
      console.log('Redis connected successfully')
    })
  }

  return redisClient
}

// 缓存工具函数
export async function setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
  const client = getRedisClient()
  const serializedValue = JSON.stringify(value)
  await client.setex(key, ttl, serializedValue)
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  const value = await client.get(key)

  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.error('Error parsing cached value:', error)
    return null
  }
}

export async function deleteCache(key: string): Promise<void> {
  const client = getRedisClient()
  await client.del(key)
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient()
  const keys = await client.keys(pattern)

  if (keys.length > 0) {
    await client.del(...keys)
  }
}

// 排行榜相关函数
export async function updateLeaderboard(competitionId: string, teamId: string, score: number): Promise<void> {
  const client = getRedisClient()
  const key = `leaderboard:${competitionId}`

  await client.zadd(key, score, teamId)
}

export async function getLeaderboard(competitionId: string, limit: number = 100): Promise<Array<{ teamId: string, score: number, rank: number }>> {
  const client = getRedisClient()
  const key = `leaderboard:${competitionId}`

  // 获取排行榜（按分数降序）
  const results = await client.zrevrange(key, 0, limit - 1, 'WITHSCORES')

  const leaderboard: Array<{ teamId: string, score: number, rank: number }> = []

  for (let i = 0; i < results.length; i += 2) {
    const teamId = results[i]
    const score = parseFloat(results[i + 1])
    const rank = Math.floor(i / 2) + 1

    leaderboard.push({ teamId, score, rank })
  }

  return leaderboard
}

export async function getTeamRank(competitionId: string, teamId: string): Promise<{ rank: number, score: number } | null> {
  const client = getRedisClient()
  const key = `leaderboard:${competitionId}`

  const [rank, score] = await Promise.all([
    client.zrevrank(key, teamId),
    client.zscore(key, teamId)
  ])

  if (rank === null || score === null) {
    return null
  }

  return {
    rank: rank + 1, // Redis rank is 0-based, we want 1-based
    score: parseFloat(score)
  }
}

// 会话缓存
export async function setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
  const key = `session:${userId}`
  await setCache(key, sessionData, ttl)
}

export async function getUserSession<T>(userId: string): Promise<T | null> {
  const key = `session:${userId}`
  return await getCache<T>(key)
}

export async function deleteUserSession(userId: string): Promise<void> {
  const key = `session:${userId}`
  await deleteCache(key)
}

// 比赛缓存
export async function cacheCompetition(competitionId: string, competition: any, ttl: number = 1800): Promise<void> {
  const key = `competition:${competitionId}`
  await setCache(key, competition, ttl)
}

export async function getCachedCompetition<T>(competitionId: string): Promise<T | null> {
  const key = `competition:${competitionId}`
  return await getCache<T>(key)
}

export async function invalidateCompetitionCache(competitionId: string): Promise<void> {
  const key = `competition:${competitionId}`
  await deleteCache(key)

  // 同时清除相关的题目缓存
  await deleteCachePattern(`problem:${competitionId}:*`)
}

// 题目缓存
export async function cacheProblem(problemId: string, problem: any, ttl: number = 1800): Promise<void> {
  const key = `problem:${problemId}`
  await setCache(key, problem, ttl)
}

export async function getCachedProblem<T>(problemId: string): Promise<T | null> {
  const key = `problem:${problemId}`
  return await getCache<T>(key)
}

export async function invalidateProblemCache(problemId: string): Promise<void> {
  const key = `problem:${problemId}`
  await deleteCache(key)
}

// 队伍缓存
export async function cacheTeam(teamId: string, team: any, ttl: number = 1800): Promise<void> {
  const key = `team:${teamId}`
  await setCache(key, team, ttl)
}

export async function getCachedTeam<T>(teamId: string): Promise<T | null> {
  const key = `team:${teamId}`
  return await getCache<T>(key)
}

export async function invalidateTeamCache(teamId: string): Promise<void> {
  const key = `team:${teamId}`
  await deleteCache(key)
}

export async function invalidateUserTeamsCache(userId: string): Promise<void> {
  const key = `user:${userId}:teams`
  await deleteCache(key)
}
