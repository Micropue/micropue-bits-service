import Aura from '@primeuix/themes/aura'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@primevue/nuxt-module'],
  primevue: {
    options: {
      ripple: true,
      theme: {
        preset: Aura,
      }
    }
  },
  devServer:{
    port: 3500
  }
})
