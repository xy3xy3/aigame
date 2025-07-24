import prisma from '../../lib/prisma'

/**
 * 获取 Prisma 客户端实例
 * 这个函数提供了一个统一的方式来访问 Prisma 客户端
 * 在 Nuxt 3 服务端 API 路由中使用
 */
export async function usePrisma() {
  return {
    $prisma: prisma
  }
}

// 导出 Prisma 客户端类型，方便类型推断
export type PrismaClient = typeof prisma
