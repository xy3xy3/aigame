// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // 模块配置
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    '@prisma/nuxt'
  ],

  // Prisma配置 - 禁用迁移提示
  prisma: {
    autoSetupPrisma: false,
    installStudio: false
  },

  // CSS配置
  css: ['~/assets/css/main.css'],

  // 运行时配置
  runtimeConfig: {
    // 私有配置（仅服务端可用）
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aigame?replicaSet=rs0',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
    minioPort: parseInt(process.env.MINIO_PORT || '9000'),
    minioAccessKey: process.env.MINIO_ACCESS_KEY || 'root',
    minioSecretKey: process.env.MINIO_SECRET_KEY || 'password',
    minioPublicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
    minioInternalUrl: process.env.MINIO_INTERNAL_URL || 'http://aigame-minio:9000',
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    evaluateAppUrl: process.env.EVALUATE_APP_URL || 'http://localhost:8000',

    // 公共配置（客户端也可用）
    public: {
      appName: 'AI竞赛平台',
      apiBase: '/api',
      minioPublicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'
    }
  },

  // 颜色模式配置
  colorMode: {
    preference: 'system',
    fallback: 'light',
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    storageKey: 'nuxt-color-mode'
  },



  // Nitro配置（服务端）
  nitro: {
    experimental: {
      wasm: true
    }
  }
})
