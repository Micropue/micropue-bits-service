import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// 黑/白单色主题：primary 映射到中性色阶
// light：近黑按钮 + 白字；dark：白按钮 + 黑字

// https://nuxt.com/docs/api/configuration/nuxt-config

const Noir = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{zinc.50}',
      100: '{zinc.100}',
      200: '{zinc.200}',
      300: '{zinc.300}',
      400: '{zinc.400}',
      500: '{zinc.500}',
      600: '{zinc.600}',
      700: '{zinc.700}',
      800: '{zinc.800}',
      900: '{zinc.900}',
      950: '{zinc.950}'
    },

    colorScheme: {
      light: {
        primary: {
          color: '{zinc.950}',
          inverseColor: '#ffffff',
          hoverColor: '{zinc.900}',
          activeColor: '{zinc.800}'
        }
      },

      dark: {
        primary: {
          color: '{zinc.50}',
          inverseColor: '{zinc.950}',
          hoverColor: '{zinc.100}',
          activeColor: '{zinc.200}'
        }
      }
    }
  },

  // Aura 默认是红/蓝/绿/黄四色渐变圈，改为灰阶
  components: {
    progressspinner: {
      colorScheme: {
        light: {
          root: {
            colorOne: '{zinc.300}',
            colorTwo: '{zinc.500}',
            colorThree: '{zinc.700}',
            colorFour: '{zinc.900}'
          }
        },
        dark: {
          root: {
            colorOne: '{zinc.700}',
            colorTwo: '{zinc.500}',
            colorThree: '{zinc.300}',
            colorFour: '{zinc.100}'
          }
        }
      }
    }
  }
})
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.scss'],
  modules: ['@primevue/nuxt-module'],
  primevue: {
    options: {
      ripple: false,
      theme: {
        preset: Noir
      }
    }
  },
  runtimeConfig: {
    public: {
      // hCaptcha 前端 sitekey（来自 .env 的 HCAPTCHA_SITEKEY）
      hcaptchaSitekey: process.env.HCAPTCHA_SITEKEY || '',
      // 开发模式（MODE=dev）：前端仍调起人机校验，但取不到 token 时不拦截（后端跳过校验）
      devMode: process.env.MODE === 'dev'
    }
  },
  devServer: {
    port: 3500,
  },
  vite: {
    server: {
      // 允许 natapp 内网穿透域名访问开发服务器（前导点匹配所有子域）
      allowedHosts: true,
    }
  }
})
