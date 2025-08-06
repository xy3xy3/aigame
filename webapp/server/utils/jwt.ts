import jwt from 'jsonwebtoken'
import type { User } from '@prisma/client'
import prisma from './prisma'

export interface JwtPayload {
  userId: string
  username: string
  email: string
}

export function generateToken(user: User): string {
  const config = useRuntimeConfig()
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email
  }

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
    issuer: 'aigame-platform'
  })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const config = useRuntimeConfig()
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'aigame-platform'
    }) as JwtPayload

    return decoded
  } catch (error) {
    return null
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token)
  if (!payload) return null



  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })
    return user
  } catch (error) {
    return null
  }
}