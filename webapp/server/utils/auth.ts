import bcrypt from 'bcryptjs'
import type { User } from '@prisma/client'
import { createError } from 'h3'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

export function excludePassword<T extends Record<string, any>>(
  user: T
): Omit<T, 'passwordHash'> {
  const { passwordHash, ...userWithoutPassword } = user
  return userWithoutPassword
}

export function requireAdminRole(user: User): void {
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Admin access required'
    })
  }
}

/**
 * 检查用户是否被封禁
 */
export function checkUserBanned(user: User): void {
  if (user.status === 'BANNED') {
    throw createError({
      statusCode: 403,
      statusMessage: '账号已被封禁，无法访问'
    })
  }
}

/**
 * 检查用户是否为活跃状态（已验证邮箱）
 */
export function requireActiveUser(user: User): void {
  if (user.status === 'PENDING') {
    throw createError({
      statusCode: 403,
      statusMessage: '请先验证邮箱后再进行此操作'
    })
  }

  checkUserBanned(user)
}

/**
 * 检查用户状态是否允许登录
 */
export function checkUserCanLogin(user: User): void {
  if (user.status === 'BANNED') {
    throw createError({
      statusCode: 403,
      statusMessage: '账号已被封禁，无法登录'
    })
  }
}

export type SafeUser = Omit<User, 'passwordHash'>