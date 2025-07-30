import { useState } from '#app'

export function useSettings() {
    // 创建全局响应式状态
    const settings = useState('settings', () => ({
        title: '',
        copyright: ''
    }))

    // 获取最新设置的函数
    const fetchSettings = async () => {
        try {
            const response = await $fetch('/api/settings')
            if (response?.success && response?.data) {
                settings.value = {
                    title: response.data.title || '',
                    copyright: response.data.copyright || ''
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
            throw error
        }
    }

    // 初始化数据
    fetchSettings()

    return {
        settings,
        fetchSettings
    }
}