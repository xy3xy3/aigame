/**
 * 题解相关工具函数
 */

export interface SolutionTimeInfo {
    /** 是否在题解提交时间窗口内 */
    canSubmit: boolean
    /** 是否比赛已结束 */
    competitionEnded: boolean
    /** 题解提交截止时间 */
    deadline: Date
    /** 剩余提交时间（毫秒） */
    remainingTime: number
    /** 格式化的剩余时间文本 */
    remainingTimeText: string
    /** 状态文本 */
    statusText: string
    /** 状态类型 */
    statusType: 'waiting' | 'open' | 'closed'
}

/**
 * 判断题解提交时间窗口状态
 * @param competitionEndTime - 比赛结束时间
 * @returns 题解时间信息
 */
export function getSolutionTimeInfo(competitionEndTime: string | Date): SolutionTimeInfo {
    const now = new Date()
    const endTime = new Date(competitionEndTime)

    // 题解提交截止时间：比赛结束后2天
    const deadline = new Date(endTime.getTime() + 2 * 24 * 60 * 60 * 1000)

    const competitionEnded = now >= endTime
    const canSubmit = competitionEnded && now <= deadline
    const remainingTime = deadline.getTime() - now.getTime()

    let statusType: 'waiting' | 'open' | 'closed'
    let statusText: string

    if (!competitionEnded) {
        statusType = 'waiting'
        statusText = '等待比赛结束'
    } else if (canSubmit) {
        statusType = 'open'
        statusText = '可以提交题解'
    } else {
        statusType = 'closed'
        statusText = '题解提交已截止'
    }

    return {
        canSubmit,
        competitionEnded,
        deadline,
        remainingTime: Math.max(0, remainingTime),
        remainingTimeText: formatRemainingTime(remainingTime),
        statusText,
        statusType
    }
}

/**
 * 格式化剩余时间
 * @param milliseconds - 剩余毫秒数
 * @returns 格式化的时间文本
 */
export function formatRemainingTime(milliseconds: number): string {
    if (milliseconds <= 0) {
        return '已截止'
    }

    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
        const remainingHours = hours % 24
        if (remainingHours > 0) {
            return `${days}天${remainingHours}小时`
        }
        return `${days}天`
    }

    if (hours > 0) {
        const remainingMinutes = minutes % 60
        if (remainingMinutes > 0) {
            return `${hours}小时${remainingMinutes}分钟`
        }
        return `${hours}小时`
    }

    if (minutes > 0) {
        return `${minutes}分钟`
    }

    return '不到1分钟'
}

/**
 * 获取题解提交状态的样式类
 * @param statusType - 状态类型
 * @returns CSS类名
 */
export function getSolutionStatusClass(statusType: 'waiting' | 'open' | 'closed'): string {
    const classMap = {
        waiting: 'bg-yellow-100 text-yellow-800',
        open: 'bg-green-100 text-green-800',
        closed: 'bg-gray-100 text-gray-800'
    }

    return classMap[statusType]
}

/**
 * 检查用户是否可以访问题解提交功能
 * @param userTeams - 用户所属团队列表
 * @param competitionId - 比赛ID
 * @returns 是否可以访问
 */
export function canAccessSolutionSubmission(
    userTeams: Array<{ id: string; participatingIn: string[] }>,
    competitionId: string
): boolean {
    return userTeams.some(team => team.participatingIn.includes(competitionId))
}

/**
 * 获取用户参赛团队（参加了指定比赛的团队）
 * @param userTeams - 用户所属团队列表
 * @param competitionId - 比赛ID
 * @returns 参赛团队列表
 */
export function getParticipatingTeams(
    userTeams: Array<{ id: string; name: string; participatingIn: string[] }>,
    competitionId: string
): Array<{ id: string; name: string }> {
    return userTeams
        .filter(team => team.participatingIn.includes(competitionId))
        .map(team => ({ id: team.id, name: team.name }))
}