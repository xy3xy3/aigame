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
  ],

  // PostCSS 配置 (支持 Tailwind CSS v4)
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {}
    }
  },


  // CSS配置
  css: [
    '~/assets/css/main.css',//本项目唯一css
    '@fortawesome/fontawesome-free/css/all.min.css', // Font Awesome 全局样式
    'notivue/notification.css', // 通知插件的css，必须引入
    'notivue/animations.css' // 通知插件的css，必须引入
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
    evaluateAppSecret: process.env.EVALUATE_APP_SECRET,
    // 新增：webapp -> evaluateapp 上传鉴权密钥（与回调密钥不同）
    evaluateAppUploadSecret: process.env.EVALUATE_APP_UPLOAD_SECRET,
    // 新增：webapp的对外访问基础URL，用于构造默认回调URL（当节点未设置callbackUrl时使用）
    webappBaseUrl: process.env.WEBAPP_BASE_URL,
    // 评测超时时间（毫秒），用于在长时间无回调时自动置为错误
    evaluationTimeoutMs: process.env.EVALUATION_TIMEOUT_MS || '900000',

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
