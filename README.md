# BITS

A community for sharing code snippets — publish, discover, collect and fork reusable code.

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PrimeVue](https://img.shields.io/badge/PrimeVue-4-10B981)
![motion-v](https://img.shields.io/badge/motion--v-1.x-000000)
![Sass](https://img.shields.io/badge/Sass-SCSS-CC6699?logo=sass&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-8-DC382D?logo=redis&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?logo=docker&logoColor=white)

## Tech Stack

- **Framework**: Nuxt 4 + Vue 3 + TypeScript
- **UI**: PrimeVue 4 with a custom black/white preset, SCSS
- **Animation**: motion-v (Vue Bits components: `RotatingText`, `DriftWall`)
- **Database**: MySQL 8.4 (`mysql2`), Redis 8 for caching
- **Mail**: SMTP (Tencent Exmail)
- **Local services**: Docker Compose

## Requirements

- Node.js 20+ (developed on 22)
- Docker (for MySQL and Redis)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then fill in the values you need

# 3. Start MySQL + Redis
docker compose up -d

# 4. Start the dev server (http://localhost:3500)
npm run dev
```

The `users` table is created automatically on first startup (idempotent).

## Environment Variables

All dynamic configuration lives in `.env` (see `.env.example`):

| Group | Variables |
| --- | --- |
| MySQL | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` |
| Redis | `REDIS_HOST`, `REDIS_PORT` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` |
| Misc | `NUXT_PUBLIC_PRIMEUI_LICENSE` |

Secrets must never be committed to the repository.

## Build & Deployment

```bash
# Production build (outputs to .output/)
npm run build

# Run the production server
node .output/server/index.mjs

# Or preview the build locally
npm run preview
```

The Nitro server reads the same `.env` variables. To run MySQL/Redis in containers alongside the app, point `MYSQL_HOST` / `REDIS_HOST` at the compose service names (`mysql` / `redis`) instead of `127.0.0.1`.

### Ports

| Service | Port |
| --- | --- |
| Web (dev) | 3500 |
| MySQL | 3311 |
| Redis | 6479 |

## Project Structure

```
app/
  components/    RotatingText.vue, DriftWall.vue
  layouts/       default.vue
  pages/         index.vue
  assets/css/    main.scss
server/
  api/github/    star.get.ts
  plugins/       db-init.ts
  utils/         db.ts
docker-compose.yml
nuxt.config.ts
.env.example
```

## Status

V1 is under active development. Implemented so far:

- Landing page: hero with rotating text, drifting wall background, global snippet search box with keyword tokens (space to tokenize, paste auto-splits, click a token to remove)
- GitHub star counter API
- MySQL bootstrap (auto-created `users` table)

Planned: account system (email / passkey / GitHub), snippet and group management, search, notifications, admin. See `项目综合设计.md` for the full specification.
