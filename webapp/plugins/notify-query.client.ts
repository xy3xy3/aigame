import { push } from 'notivue'

export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.afterEach((to) => {
    const { error, message } = to.query as Record<string, unknown>

    const hasError = typeof error === 'string' && error.length > 0
    const hasMessage = typeof message === 'string' && message.length > 0

    if (!hasError && !hasMessage) return

    // 优先展示 message，其次根据 error 码给出默认文案
    const text = hasMessage
      ? (message as string)
      : (error === 'access_denied' ? '您没有权限访问此页面' : '发生错误')

    try {
      // 优先使用类型化方法，否则退回基础 push
      // @ts-ignore - 兼容不同版本的 notivue 类型
      if (typeof push.error === 'function') {
        // @ts-ignore
        push.error(text)
      } else {
        // @ts-ignore
        push({ message: text, type: 'error' })
      }
    } catch {
      // 忽略通知错误，保证路由继续
    }

    // 清理 URL 上的提示参数，避免刷新/后退重复弹出
    const cleaned = { ...to.query }
    delete (cleaned as any).error
    delete (cleaned as any).message
    router.replace({ path: to.path, query: cleaned })
  })
})

