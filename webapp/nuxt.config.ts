// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // 模块配置
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    'notivue/nuxt',
    '@nuxt/ui',
  ],

  // PostCSS 配置 (支持 Tailwind CSS v4)
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {}
    }
  },


  ui: {
    fonts: false, // 禁用字体模块，避免加载 Google Fonts
  },


  // CSS配置
  css: [
    '~/assets/css/main.css',
  ],

  // 运行时配置
  runtimeConfig: {
    // 私有配置（仅服务端可用）
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aigame?replicaSet=rs0',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisPassword: process.env.REDIS_PASSWORD,
    minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
    minioPort: parseInt(process.env.MINIO_PORT || '9000'),
    minioAccessKey: process.env.MINIO_ACCESS_KEY || 'root',
    minioSecretKey: process.env.MINIO_SECRET_KEY || 'password',
    minioPublicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
    minioInternalUrl: process.env.MINIO_INTERNAL_URL || 'http://minio:9000',
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
  },
  //vite

  vite: {
    optimizeDeps: {
      include: [
        // 强烈建议：优化大型图表库
        'echarts',
        // 建议：优化客户端 Markdown 解析
        'marked',
        // 可选：优化日期库
        'dayjs',
      ]
    }
  }
})
