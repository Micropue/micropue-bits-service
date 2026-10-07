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
  devServer: {
    port: 3500
  }
})
