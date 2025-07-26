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

export type SafeUser = Omit<User, 'passwordHash'>