// 系统预置依赖目录（框架/库/工具/运行时）：数据库检测时缺失即补齐、空字段即回填，已存在的内容不覆盖
// 框架与库同表，用 kind 区分；条目的适用语言是多对多（languages 数组，首项为主语言），写 languages.slug；
// 同一生态内互相可用的语言一起标注（如 JavaScript 生态的条目同时标注 typescript）
// logo_url 使用公共 CDN：Simple Icons（cdn.simpleicons.org）；无图标的留空由前端兜底
// 顺序即选择器展示顺序（sort_order = 下标 × 10）
// 规范详见 项目综合设计.md「二、数据结构与开发规范」

export type DependencyKind = 'framework' | 'library' | 'tool' | 'runtime'

export interface DependencySeed {
  slug: string
  name: string
  languages: string[]
  kind: DependencyKind
  intro: string
  link_url: string
  logo_url: string | null
}

export const DEPENDENCY_SEED: DependencySeed[] = [
  // ---------- JavaScript / TypeScript 生态 ----------
  {
    slug: 'react',
    name: 'React',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A component-based library for building user interfaces.',
    link_url: 'https://react.dev/',
    logo_url: 'https://cdn.simpleicons.org/react'
  },
  {
    slug: 'vue',
    name: 'Vue',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A progressive framework for building user interfaces.',
    link_url: 'https://vuejs.org/',
    logo_url: 'https://cdn.simpleicons.org/vuedotjs'
  },
  {
    slug: 'angular',
    name: 'Angular',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'A TypeScript-first platform for building large single-page applications.',
    link_url: 'https://angular.dev/',
    logo_url: 'https://cdn.simpleicons.org/angular'
  },
  {
    slug: 'svelte',
    name: 'Svelte',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A compiler that turns declarative components into lean JavaScript.',
    link_url: 'https://svelte.dev/',
    logo_url: 'https://cdn.simpleicons.org/svelte'
  },
  {
    slug: 'solid',
    name: 'SolidJS',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A fine-grained reactive UI library with no virtual DOM.',
    link_url: 'https://www.solidjs.com/',
    logo_url: 'https://cdn.simpleicons.org/solid'
  },
  {
    slug: 'preact',
    name: 'Preact',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A tiny, fast alternative to React with a compatible API.',
    link_url: 'https://preactjs.com/',
    logo_url: 'https://cdn.simpleicons.org/preact'
  },
  {
    slug: 'next',
    name: 'Next.js',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'The React framework for server-rendered and static web apps.',
    link_url: 'https://nextjs.org/',
    logo_url: 'https://cdn.simpleicons.org/nextdotjs'
  },
  {
    slug: 'nuxt',
    name: 'Nuxt',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'The Vue framework for full-stack web applications.',
    link_url: 'https://nuxt.com/',
    logo_url: 'https://cdn.simpleicons.org/nuxt'
  },
  {
    slug: 'remix',
    name: 'Remix',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A web framework built on web standards and nested routes.',
    link_url: 'https://remix.run/',
    logo_url: 'https://cdn.simpleicons.org/remix'
  },
  {
    slug: 'astro',
    name: 'Astro',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A content-focused framework that ships zero JavaScript by default.',
    link_url: 'https://astro.build/',
    logo_url: 'https://cdn.simpleicons.org/astro'
  },
  {
    slug: 'ember',
    name: 'Ember',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A convention-over-configuration framework for ambitious web apps.',
    link_url: 'https://emberjs.com/',
    logo_url: 'https://cdn.simpleicons.org/emberdotjs'
  },
  {
    slug: 'qwik',
    name: 'Qwik',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A framework that resumes instantly on the client without hydration.',
    link_url: 'https://qwik.dev/',
    logo_url: 'https://cdn.simpleicons.org/qwik'
  },
  {
    slug: 'express',
    name: 'Express',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A minimal, unopinionated web framework for Node.js.',
    link_url: 'https://expressjs.com/',
    logo_url: 'https://cdn.simpleicons.org/express'
  },
  {
    slug: 'nestjs',
    name: 'NestJS',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'A structured Node.js framework with dependency injection.',
    link_url: 'https://nestjs.com/',
    logo_url: 'https://cdn.simpleicons.org/nestjs'
  },
  {
    slug: 'koa',
    name: 'Koa',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A small, modern middleware framework for Node.js from the Express team.',
    link_url: 'https://koajs.com/',
    logo_url: 'https://cdn.simpleicons.org/koa'
  },
  {
    slug: 'fastify',
    name: 'Fastify',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A fast and low-overhead web framework for Node.js.',
    link_url: 'https://fastify.dev/',
    logo_url: 'https://cdn.simpleicons.org/fastify'
  },
  {
    slug: 'tailwindcss',
    name: 'Tailwind CSS',
    languages: ['css'],
    kind: 'framework',
    intro: 'A utility-first CSS framework for building custom designs.',
    link_url: 'https://tailwindcss.com/',
    logo_url: 'https://cdn.simpleicons.org/tailwindcss'
  },
  {
    slug: 'bootstrap',
    name: 'Bootstrap',
    languages: ['css'],
    kind: 'framework',
    intro: 'A popular CSS framework for responsive, mobile-first layouts.',
    link_url: 'https://getbootstrap.com/',
    logo_url: 'https://cdn.simpleicons.org/bootstrap'
  },
  {
    slug: 'react-native',
    name: 'React Native',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'Build native mobile apps with React components.',
    link_url: 'https://reactnative.dev/',
    logo_url: null
  },
  {
    slug: 'electron',
    name: 'Electron',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'Build cross-platform desktop apps with web technologies.',
    link_url: 'https://www.electronjs.org/',
    logo_url: 'https://cdn.simpleicons.org/electron'
  },

  // ---------- Python 生态 ----------
  {
    slug: 'django',
    name: 'Django',
    languages: ['python'],
    kind: 'framework',
    intro: 'A batteries-included web framework for rapid development.',
    link_url: 'https://www.djangoproject.com/',
    logo_url: 'https://cdn.simpleicons.org/django'
  },
  {
    slug: 'flask',
    name: 'Flask',
    languages: ['python'],
    kind: 'framework',
    intro: 'A lightweight WSGI micro-framework for Python.',
    link_url: 'https://flask.palletsprojects.com/',
    logo_url: 'https://cdn.simpleicons.org/flask'
  },
  {
    slug: 'fastapi',
    name: 'FastAPI',
    languages: ['python'],
    kind: 'framework',
    intro: 'A modern, fast API framework based on type hints.',
    link_url: 'https://fastapi.tiangolo.com/',
    logo_url: 'https://cdn.simpleicons.org/fastapi'
  },
  {
    slug: 'pytorch',
    name: 'PyTorch',
    languages: ['python', 'cpp'],
    kind: 'framework',
    intro: 'A deep learning framework with dynamic computation graphs.',
    link_url: 'https://pytorch.org/',
    logo_url: 'https://cdn.simpleicons.org/pytorch'
  },
  {
    slug: 'tensorflow',
    name: 'TensorFlow',
    languages: ['python', 'cpp'],
    kind: 'framework',
    intro: 'An end-to-end platform for machine learning.',
    link_url: 'https://www.tensorflow.org/',
    logo_url: 'https://cdn.simpleicons.org/tensorflow'
  },
  {
    slug: 'keras',
    name: 'Keras',
    languages: ['python'],
    kind: 'framework',
    intro: 'A high-level API for building and training neural networks.',
    link_url: 'https://keras.io/',
    logo_url: 'https://cdn.simpleicons.org/keras'
  },
  {
    slug: 'scikit-learn',
    name: 'scikit-learn',
    languages: ['python'],
    kind: 'framework',
    intro: 'Classic machine learning algorithms behind one consistent API.',
    link_url: 'https://scikit-learn.org/',
    logo_url: 'https://cdn.simpleicons.org/scikitlearn'
  },

  // ---------- Ruby / PHP ----------
  {
    slug: 'rails',
    name: 'Ruby on Rails',
    languages: ['ruby'],
    kind: 'framework',
    intro: 'A full-stack framework optimised for programmer happiness.',
    link_url: 'https://rubyonrails.org/',
    logo_url: 'https://cdn.simpleicons.org/rubyonrails'
  },
  {
    slug: 'laravel',
    name: 'Laravel',
    languages: ['php'],
    kind: 'framework',
    intro: 'An expressive framework for modern PHP applications.',
    link_url: 'https://laravel.com/',
    logo_url: 'https://cdn.simpleicons.org/laravel'
  },
  {
    slug: 'symfony',
    name: 'Symfony',
    languages: ['php'],
    kind: 'framework',
    intro: 'Reusable PHP components plus a full-stack web framework.',
    link_url: 'https://symfony.com/',
    logo_url: 'https://cdn.simpleicons.org/symfony'
  },

  // ---------- Java / .NET ----------
  {
    slug: 'spring',
    name: 'Spring',
    languages: ['java', 'kotlin'],
    kind: 'framework',
    intro: 'The de facto standard framework for Java applications.',
    link_url: 'https://spring.io/',
    logo_url: 'https://cdn.simpleicons.org/spring'
  },
  {
    slug: 'spring-boot',
    name: 'Spring Boot',
    languages: ['java', 'kotlin'],
    kind: 'framework',
    intro: 'Convention-over-configuration Spring apps you can run standalone.',
    link_url: 'https://spring.io/projects/spring-boot',
    logo_url: 'https://cdn.simpleicons.org/springboot'
  },
  {
    slug: 'quarkus',
    name: 'Quarkus',
    languages: ['java', 'kotlin'],
    kind: 'framework',
    intro: 'A Kubernetes-native Java framework with fast startup and low memory.',
    link_url: 'https://quarkus.io/',
    logo_url: 'https://cdn.simpleicons.org/quarkus'
  },
  {
    slug: 'micronaut',
    name: 'Micronaut',
    languages: ['java', 'kotlin'],
    kind: 'framework',
    intro: 'A modern JVM framework designed for low memory and fast startup.',
    link_url: 'https://micronaut.io/',
    logo_url: null
  },
  {
    slug: 'aspnet-core',
    name: 'ASP.NET Core',
    languages: ['csharp'],
    kind: 'framework',
    intro: 'A cross-platform framework for modern web apps and APIs on .NET.',
    link_url: 'https://dotnet.microsoft.com/apps/aspnet',
    logo_url: 'https://cdn.simpleicons.org/dotnet'
  },

  // ---------- Elixir / Go / Rust ----------
  {
    slug: 'phoenix',
    name: 'Phoenix',
    languages: ['elixir'],
    kind: 'framework',
    intro: 'A productive web framework for Elixir with real-time features.',
    link_url: 'https://www.phoenixframework.org/',
    logo_url: 'https://cdn.simpleicons.org/phoenixframework'
  },
  {
    slug: 'gin',
    name: 'Gin',
    languages: ['go'],
    kind: 'framework',
    intro: 'A fast HTTP web framework for Go with a minimal API.',
    link_url: 'https://gin-gonic.com/',
    logo_url: 'https://cdn.simpleicons.org/gin'
  },
  {
    slug: 'echo',
    name: 'Echo',
    languages: ['go'],
    kind: 'framework',
    intro: 'A high-performance, extensible web framework for Go.',
    link_url: 'https://echo.labstack.com/',
    logo_url: null
  },
  {
    slug: 'fiber',
    name: 'Fiber',
    languages: ['go'],
    kind: 'framework',
    intro: 'An Express-inspired web framework for Go built on fasthttp.',
    link_url: 'https://gofiber.io/',
    logo_url: null
  },
  {
    slug: 'actix',
    name: 'Actix',
    languages: ['rust'],
    kind: 'framework',
    intro: 'A powerful actor-based framework for Rust web services.',
    link_url: 'https://actix.rs/',
    logo_url: 'https://cdn.simpleicons.org/actix'
  },
  {
    slug: 'axum',
    name: 'Axum',
    languages: ['rust'],
    kind: 'framework',
    intro: 'An ergonomic Rust web framework built on Tokio and Tower.',
    link_url: 'https://github.com/tokio-rs/axum',
    logo_url: null
  },
  {
    slug: 'rocket',
    name: 'Rocket',
    languages: ['rust'],
    kind: 'framework',
    intro: 'A Rust web framework focused on usability and safety.',
    link_url: 'https://rocket.rs/',
    logo_url: 'https://cdn.simpleicons.org/rocket'
  },
  {
    slug: 'tauri',
    name: 'Tauri',
    languages: ['rust'],
    kind: 'framework',
    intro: 'Build small, fast desktop apps with a Rust core and a web UI.',
    link_url: 'https://tauri.app/',
    logo_url: 'https://cdn.simpleicons.org/tauri'
  },

  // ---------- 移动端 / 桌面 / 游戏 ----------
  {
    slug: 'flutter',
    name: 'Flutter',
    languages: ['dart'],
    kind: 'framework',
    intro: 'A UI toolkit for natively compiled apps from a single codebase.',
    link_url: 'https://flutter.dev/',
    logo_url: 'https://cdn.simpleicons.org/flutter'
  },
  {
    slug: 'qt',
    name: 'Qt',
    languages: ['cpp', 'python', 'qml'],
    kind: 'framework',
    intro: 'A cross-platform framework for native applications and user interfaces.',
    link_url: 'https://www.qt.io/',
    logo_url: 'https://cdn.simpleicons.org/qt'
  },
  {
    slug: 'unity',
    name: 'Unity',
    languages: ['csharp'],
    kind: 'framework',
    intro: 'A cross-platform engine for 2D and 3D games.',
    link_url: 'https://unity.com/',
    // simple-icons 的 Unity 默认是白色，白底方块上不可见，这里指定深色
    logo_url: 'https://cdn.simpleicons.org/unity/18181b'
  },
  {
    slug: 'godot',
    name: 'Godot',
    languages: ['cpp', 'csharp', 'gdscript'],
    kind: 'framework',
    intro: 'A free, open-source engine for 2D and 3D games.',
    link_url: 'https://godotengine.org/',
    logo_url: 'https://cdn.simpleicons.org/godotengine'
  },

  // ---------- 运行时 ----------
  {
    slug: 'nodejs',
    name: 'Node.js',
    languages: ['javascript', 'typescript'],
    kind: 'runtime',
    intro: 'A JavaScript runtime for building scalable network applications.',
    link_url: 'https://nodejs.org/',
    logo_url: 'https://cdn.simpleicons.org/nodedotjs'
  },
  {
    slug: 'deno',
    name: 'Deno',
    languages: ['typescript', 'javascript'],
    kind: 'runtime',
    intro: 'A secure runtime for JavaScript and TypeScript with built-in tooling.',
    link_url: 'https://deno.com/',
    logo_url: 'https://cdn.simpleicons.org/deno'
  },
  {
    slug: 'bun',
    name: 'Bun',
    languages: ['javascript', 'typescript'],
    kind: 'runtime',
    intro: 'An all-in-one JavaScript runtime, bundler and package manager.',
    link_url: 'https://bun.sh/',
    logo_url: 'https://cdn.simpleicons.org/bun'
  },
  {
    slug: 'dotnet',
    name: '.NET',
    languages: ['csharp'],
    kind: 'runtime',
    intro: 'A cross-platform runtime and library set for modern applications.',
    link_url: 'https://dotnet.microsoft.com/',
    logo_url: 'https://cdn.simpleicons.org/dotnet'
  },

  // ---------- 工具链 ----------
  {
    slug: 'vite',
    name: 'Vite',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A fast dev server and bundler powered by native ES modules.',
    link_url: 'https://vite.dev/',
    logo_url: 'https://cdn.simpleicons.org/vite'
  },
  {
    slug: 'webpack',
    name: 'webpack',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A module bundler for JavaScript applications.',
    link_url: 'https://webpack.js.org/',
    logo_url: 'https://cdn.simpleicons.org/webpack'
  },
  {
    slug: 'rollup',
    name: 'Rollup',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A module bundler for libraries with built-in tree shaking.',
    link_url: 'https://rollupjs.org/',
    logo_url: 'https://cdn.simpleicons.org/rollupdotjs'
  },
  {
    slug: 'esbuild',
    name: 'esbuild',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'An extremely fast bundler and minifier written in Go.',
    link_url: 'https://esbuild.github.io/',
    logo_url: 'https://cdn.simpleicons.org/esbuild'
  },
  {
    slug: 'babel',
    name: 'Babel',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A compiler that turns modern JavaScript into compatible output.',
    link_url: 'https://babeljs.io/',
    logo_url: 'https://cdn.simpleicons.org/babel'
  },
  {
    slug: 'eslint',
    name: 'ESLint',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A pluggable linter for finding and fixing JavaScript problems.',
    link_url: 'https://eslint.org/',
    logo_url: 'https://cdn.simpleicons.org/eslint'
  },
  {
    slug: 'prettier',
    name: 'Prettier',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'An opinionated code formatter with broad language support.',
    link_url: 'https://prettier.io/',
    logo_url: 'https://cdn.simpleicons.org/prettier'
  },
  {
    slug: 'gradle',
    name: 'Gradle',
    languages: ['java', 'kotlin'],
    kind: 'tool',
    intro: 'A build automation tool for JVM and multi-language projects.',
    link_url: 'https://gradle.org/',
    logo_url: 'https://cdn.simpleicons.org/gradle'
  },
  {
    slug: 'maven',
    name: 'Maven',
    languages: ['java', 'kotlin'],
    kind: 'tool',
    intro: 'A build and dependency management tool for Java projects.',
    link_url: 'https://maven.apache.org/',
    logo_url: 'https://cdn.simpleicons.org/apachemaven'
  },
  {
    slug: 'cmake',
    name: 'CMake',
    languages: ['cpp', 'c'],
    kind: 'tool',
    intro: 'A build system generator for C and C++ projects.',
    link_url: 'https://cmake.org/',
    logo_url: 'https://cdn.simpleicons.org/cmake'
  },
  {
    slug: 'npm',
    name: 'npm',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'The package manager that ships with Node.js.',
    link_url: 'https://www.npmjs.com/',
    logo_url: 'https://cdn.simpleicons.org/npm'
  },
  {
    slug: 'pnpm',
    name: 'pnpm',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A disk-efficient package manager with strict dependency isolation.',
    link_url: 'https://pnpm.io/',
    logo_url: 'https://cdn.simpleicons.org/pnpm'
  },
  {
    slug: 'yarn',
    name: 'Yarn',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A fast, reliable package manager for JavaScript projects.',
    link_url: 'https://yarnpkg.com/',
    logo_url: 'https://cdn.simpleicons.org/yarn'
  },
  {
    slug: 'storybook',
    name: 'Storybook',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A workshop for developing and testing UI components in isolation.',
    link_url: 'https://storybook.js.org/',
    logo_url: 'https://cdn.simpleicons.org/storybook'
  },

  // ---------- 库 ----------
  {
    slug: 'jquery',
    name: 'jQuery',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A classic library that simplifies DOM traversal and AJAX.',
    link_url: 'https://jquery.com/',
    logo_url: 'https://cdn.simpleicons.org/jquery'
  },
  {
    slug: 'lodash',
    name: 'Lodash',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A utility library for common array, object and function tasks.',
    link_url: 'https://lodash.com/',
    logo_url: 'https://cdn.simpleicons.org/lodash'
  },
  {
    slug: 'axios',
    name: 'Axios',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A promise-based HTTP client for browsers and Node.js.',
    link_url: 'https://axios-http.com/',
    logo_url: 'https://cdn.simpleicons.org/axios'
  },
  {
    slug: 'redux',
    name: 'Redux',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A predictable state container for JavaScript applications.',
    link_url: 'https://redux.js.org/',
    logo_url: 'https://cdn.simpleicons.org/redux'
  },
  {
    slug: 'pinia',
    name: 'Pinia',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'The official store library for Vue with a simple, typed API.',
    link_url: 'https://pinia.vuejs.org/',
    logo_url: 'https://cdn.simpleicons.org/pinia'
  },
  {
    slug: 'rxjs',
    name: 'RxJS',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Reactive programming with composable observable streams.',
    link_url: 'https://rxjs.dev/',
    logo_url: 'https://cdn.simpleicons.org/reactivex'
  },
  {
    slug: 'threejs',
    name: 'three.js',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A 3D library that brings WebGL to the browser.',
    link_url: 'https://threejs.org/',
    logo_url: 'https://cdn.simpleicons.org/threedotjs'
  },
  {
    slug: 'd3',
    name: 'D3',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Data-driven documents for building custom visualisations.',
    link_url: 'https://d3js.org/',
    logo_url: 'https://cdn.simpleicons.org/d3'
  },
  {
    slug: 'chartjs',
    name: 'Chart.js',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Simple, flexible charts drawn on the HTML canvas.',
    link_url: 'https://www.chartjs.org/',
    logo_url: 'https://cdn.simpleicons.org/chartdotjs'
  },
  {
    slug: 'socketio',
    name: 'Socket.IO',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Bidirectional, event-based realtime communication.',
    link_url: 'https://socket.io/',
    logo_url: 'https://cdn.simpleicons.org/socketdotio'
  },
  {
    slug: 'prisma',
    name: 'Prisma',
    languages: ['typescript', 'javascript'],
    kind: 'library',
    intro: 'A type-safe ORM and database toolkit for Node.js and TypeScript.',
    link_url: 'https://www.prisma.io/',
    logo_url: 'https://cdn.simpleicons.org/prisma'
  },
  {
    slug: 'numpy',
    name: 'NumPy',
    languages: ['python'],
    kind: 'library',
    intro: 'The fundamental package for numerical computing in Python.',
    link_url: 'https://numpy.org/',
    logo_url: 'https://cdn.simpleicons.org/numpy'
  },
  {
    slug: 'pandas',
    name: 'pandas',
    languages: ['python'],
    kind: 'library',
    intro: 'Data structures and tools for data analysis in Python.',
    link_url: 'https://pandas.pydata.org/',
    logo_url: 'https://cdn.simpleicons.org/pandas'
  },
  {
    slug: 'scipy',
    name: 'SciPy',
    languages: ['python'],
    kind: 'library',
    intro: 'Scientific computing algorithms built on NumPy.',
    link_url: 'https://scipy.org/',
    logo_url: 'https://cdn.simpleicons.org/scipy'
  },
  {
    slug: 'matplotlib',
    name: 'Matplotlib',
    languages: ['python'],
    kind: 'library',
    intro: 'A plotting library for publication-quality figures.',
    link_url: 'https://matplotlib.org/',
    logo_url: null
  },
  {
    slug: 'plotly',
    name: 'Plotly',
    languages: ['python'],
    kind: 'library',
    intro: 'Interactive, browser-based charts and dashboards.',
    link_url: 'https://plotly.com/python/',
    logo_url: 'https://cdn.simpleicons.org/plotly'
  },
  {
    slug: 'pytest',
    name: 'pytest',
    languages: ['python'],
    kind: 'library',
    intro: 'A mature testing framework for Python.',
    link_url: 'https://pytest.org/',
    logo_url: 'https://cdn.simpleicons.org/pytest'
  },
  {
    slug: 'sqlalchemy',
    name: 'SQLAlchemy',
    languages: ['python'],
    kind: 'library',
    intro: 'A full-featured SQL toolkit and ORM for Python.',
    link_url: 'https://www.sqlalchemy.org/',
    logo_url: 'https://cdn.simpleicons.org/sqlalchemy'
  },
  {
    slug: 'pydantic',
    name: 'Pydantic',
    languages: ['python'],
    kind: 'library',
    intro: 'Data validation using Python type hints.',
    link_url: 'https://docs.pydantic.dev/',
    logo_url: 'https://cdn.simpleicons.org/pydantic'
  },
  {
    slug: 'junit',
    name: 'JUnit',
    languages: ['java', 'kotlin'],
    kind: 'library',
    intro: 'The standard unit testing framework for Java.',
    link_url: 'https://junit.org/',
    logo_url: 'https://cdn.simpleicons.org/junit5'
  },
  {
    slug: 'hibernate',
    name: 'Hibernate',
    languages: ['java', 'kotlin'],
    kind: 'library',
    intro: 'An ORM that maps Java objects to relational databases.',
    link_url: 'https://hibernate.org/',
    logo_url: 'https://cdn.simpleicons.org/hibernate'
  },
  {
    slug: 'tokio',
    name: 'Tokio',
    languages: ['rust'],
    kind: 'library',
    intro: 'An asynchronous runtime for writing reliable Rust services.',
    link_url: 'https://tokio.rs/',
    logo_url: 'https://cdn.simpleicons.org/tokio'
  },

  // ---------- 追加批次：Web 框架 / 元框架 ----------
  {
    slug: 'sveltekit',
    name: 'SvelteKit',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'The full-stack application framework for Svelte.',
    link_url: 'https://svelte.dev/docs/kit',
    logo_url: 'https://cdn.simpleicons.org/svelte'
  },
  {
    slug: 'solidstart',
    name: 'SolidStart',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'The meta-framework that adds routing and data loading to SolidJS.',
    link_url: 'https://start.solidjs.com/',
    logo_url: 'https://cdn.simpleicons.org/solid'
  },
  {
    slug: 'hono',
    name: 'Hono',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'A small, ultrafast web framework that runs on any JavaScript runtime.',
    link_url: 'https://hono.dev/',
    logo_url: 'https://cdn.simpleicons.org/hono'
  },
  {
    slug: 'elysia',
    name: 'Elysia',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'An ergonomic, end-to-end type-safe framework for Bun.',
    link_url: 'https://elysiajs.com/',
    logo_url: null
  },
  {
    slug: 'adonisjs',
    name: 'AdonisJS',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'A batteries-included MVC framework for Node.js.',
    link_url: 'https://adonisjs.com/',
    logo_url: 'https://cdn.simpleicons.org/adonisjs'
  },
  {
    slug: 'meteor',
    name: 'Meteor',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A full-stack platform with realtime data sync from database to client.',
    link_url: 'https://www.meteor.com/',
    logo_url: 'https://cdn.simpleicons.org/meteor'
  },
  {
    slug: 'sails',
    name: 'Sails',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'An MVC framework with a data-driven API built on Express.',
    link_url: 'https://sailsjs.com/',
    logo_url: 'https://cdn.simpleicons.org/sailsdotjs'
  },
  {
    slug: 'ionic',
    name: 'Ionic',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A UI toolkit for building cross-platform mobile apps with web tech.',
    link_url: 'https://ionicframework.com/',
    logo_url: 'https://cdn.simpleicons.org/ionic'
  },
  {
    slug: 'capacitor',
    name: 'Capacitor',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A native runtime that wraps web apps into iOS and Android builds.',
    link_url: 'https://capacitorjs.com/',
    logo_url: 'https://cdn.simpleicons.org/capacitor'
  },
  {
    slug: 'expo',
    name: 'Expo',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A platform and toolchain that streamlines React Native development.',
    link_url: 'https://expo.dev/',
    logo_url: 'https://cdn.simpleicons.org/expo'
  },
  {
    slug: 'fresh',
    name: 'Fresh',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'A Deno web framework that ships no JavaScript to the client by default.',
    link_url: 'https://fresh.deno.dev/',
    logo_url: 'https://cdn.simpleicons.org/fresh'
  },
  {
    slug: 'oak',
    name: 'Oak',
    languages: ['typescript', 'javascript'],
    kind: 'framework',
    intro: 'A middleware framework for Deno inspired by Koa.',
    link_url: 'https://oakserver.org/',
    logo_url: null
  },
  {
    slug: 'vitepress',
    name: 'VitePress',
    languages: ['javascript', 'typescript', 'markdown'],
    kind: 'framework',
    intro: 'A static site generator for documentation built on Vite and Vue.',
    link_url: 'https://vitepress.dev/',
    logo_url: 'https://cdn.simpleicons.org/vitepress'
  },

  // ---------- 追加批次：Python 框架 ----------
  {
    slug: 'starlette',
    name: 'Starlette',
    languages: ['python'],
    kind: 'framework',
    intro: 'A lightweight ASGI framework and toolkit for async services.',
    link_url: 'https://www.starlette.io/',
    logo_url: null
  },
  {
    slug: 'tornado',
    name: 'Tornado',
    languages: ['python'],
    kind: 'framework',
    intro: 'A non-blocking web framework with long-lived connections in mind.',
    link_url: 'https://www.tornadoweb.org/',
    logo_url: null
  },
  {
    slug: 'sanic',
    name: 'Sanic',
    languages: ['python'],
    kind: 'framework',
    intro: 'An async web framework built for speed.',
    link_url: 'https://sanic.dev/',
    logo_url: null
  },
  {
    slug: 'pyramid',
    name: 'Pyramid',
    languages: ['python'],
    kind: 'framework',
    intro: 'A general-purpose framework that scales from small apps to large ones.',
    link_url: 'https://trypyramid.com/',
    logo_url: null
  },
  {
    slug: 'streamlit',
    name: 'Streamlit',
    languages: ['python'],
    kind: 'framework',
    intro: 'Turn data scripts into interactive web apps with plain Python.',
    link_url: 'https://streamlit.io/',
    logo_url: 'https://cdn.simpleicons.org/streamlit'
  },
  {
    slug: 'gradio',
    name: 'Gradio',
    languages: ['python'],
    kind: 'framework',
    intro: 'Build and share demos for machine learning models in a few lines.',
    link_url: 'https://www.gradio.app/',
    logo_url: null
  },

  // ---------- 追加批次：PHP / Ruby 框架 ----------
  {
    slug: 'codeigniter',
    name: 'CodeIgniter',
    languages: ['php'],
    kind: 'framework',
    intro: 'A small, low-footprint PHP framework with clear documentation.',
    link_url: 'https://codeigniter.com/',
    logo_url: 'https://cdn.simpleicons.org/codeigniter'
  },
  {
    slug: 'slim',
    name: 'Slim',
    languages: ['php'],
    kind: 'framework',
    intro: 'A micro-framework for PHP focused on routing and PSR-7 middleware.',
    link_url: 'https://www.slimframework.com/',
    logo_url: null
  },
  {
    slug: 'cakephp',
    name: 'CakePHP',
    languages: ['php'],
    kind: 'framework',
    intro: 'A rapid development framework for PHP with ORM and scaffolding.',
    link_url: 'https://cakephp.org/',
    logo_url: 'https://cdn.simpleicons.org/cakephp'
  },
  {
    slug: 'sinatra',
    name: 'Sinatra',
    languages: ['ruby'],
    kind: 'framework',
    intro: 'A tiny DSL for writing Ruby web services.',
    link_url: 'https://sinatrarb.com/',
    logo_url: 'https://cdn.simpleicons.org/rubysinatra'
  },

  // ---------- 追加批次：JVM / .NET / Go / Rust ----------
  {
    slug: 'vertx',
    name: 'Vert.x',
    languages: ['java', 'kotlin'],
    kind: 'framework',
    intro: 'A toolkit for building reactive applications on the JVM.',
    link_url: 'https://vertx.io/',
    logo_url: 'https://cdn.simpleicons.org/eclipsevertdotx'
  },
  {
    slug: 'play-framework',
    name: 'Play Framework',
    languages: ['java', 'scala'],
    kind: 'framework',
    intro: 'A reactive web framework for Java and Scala with hot reloading.',
    link_url: 'https://www.playframework.com/',
    logo_url: null
  },
  {
    slug: 'ktor',
    name: 'Ktor',
    languages: ['kotlin', 'java'],
    kind: 'framework',
    intro: 'An asynchronous framework for Kotlin services and clients.',
    link_url: 'https://ktor.io/',
    logo_url: 'https://cdn.simpleicons.org/ktor'
  },
  {
    slug: 'blazor',
    name: 'Blazor',
    languages: ['csharp'],
    kind: 'framework',
    intro: 'Build interactive web UIs with C# instead of JavaScript.',
    link_url: 'https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor',
    logo_url: 'https://cdn.simpleicons.org/blazor'
  },
  {
    slug: 'dotnet-maui',
    name: '.NET MAUI',
    languages: ['csharp'],
    kind: 'framework',
    intro: 'A single project for native mobile and desktop apps in C#.',
    link_url: 'https://dotnet.microsoft.com/apps/maui',
    logo_url: 'https://cdn.simpleicons.org/dotnet'
  },
  {
    slug: 'avalonia',
    name: 'Avalonia',
    languages: ['csharp', 'fsharp'],
    kind: 'framework',
    intro: 'A cross-platform UI framework for .NET with XAML.',
    link_url: 'https://avaloniaui.net/',
    logo_url: 'https://cdn.simpleicons.org/avaloniaui'
  },
  {
    slug: 'beego',
    name: 'Beego',
    languages: ['go'],
    kind: 'framework',
    intro: 'An MVC framework with a built-in ORM and tooling for Go.',
    link_url: 'https://beego.me/',
    logo_url: null
  },
  {
    slug: 'warp',
    name: 'Warp',
    languages: ['rust'],
    kind: 'framework',
    intro: 'A composable web server framework built on Hyper.',
    link_url: 'https://docs.rs/warp/',
    logo_url: null
  },
  {
    slug: 'leptos',
    name: 'Leptos',
    languages: ['rust'],
    kind: 'framework',
    intro: 'A full-stack reactive framework for Rust that compiles to WASM.',
    link_url: 'https://leptos.dev/',
    logo_url: 'https://cdn.simpleicons.org/leptos'
  },
  {
    slug: 'yew',
    name: 'Yew',
    languages: ['rust'],
    kind: 'framework',
    intro: 'A component-based UI framework for Rust targeting WebAssembly.',
    link_url: 'https://yew.rs/',
    logo_url: null
  },
  {
    slug: 'bevy',
    name: 'Bevy',
    languages: ['rust'],
    kind: 'framework',
    intro: 'A refreshingly simple data-driven game engine written in Rust.',
    link_url: 'https://bevyengine.org/',
    logo_url: 'https://cdn.simpleicons.org/bevy'
  },
  {
    slug: 'phoenix-liveview',
    name: 'Phoenix LiveView',
    languages: ['elixir'],
    kind: 'framework',
    intro: 'Rich, realtime user interfaces rendered on the server in Elixir.',
    link_url: 'https://hexdocs.pm/phoenix_live_view/',
    logo_url: 'https://cdn.simpleicons.org/phoenixframework'
  },

  // ---------- 追加批次：原生 UI / 游戏 ----------
  {
    slug: 'sdl',
    name: 'SDL',
    languages: ['c', 'cpp'],
    kind: 'framework',
    intro: 'A cross-platform library for windowing, input, audio and graphics.',
    link_url: 'https://www.libsdl.org/',
    logo_url: null
  },
  {
    slug: 'sfml',
    name: 'SFML',
    languages: ['cpp'],
    kind: 'framework',
    intro: 'A simple, fast multimedia library for games and multimedia apps.',
    link_url: 'https://www.sfml-dev.org/',
    logo_url: 'https://cdn.simpleicons.org/sfml'
  },
  {
    slug: 'imgui',
    name: 'Dear ImGui',
    languages: ['cpp', 'c'],
    kind: 'framework',
    intro: 'A bloat-free immediate-mode GUI library for tools and debug interfaces.',
    link_url: 'https://github.com/ocornut/imgui',
    logo_url: null
  },

  // ---------- 追加批次：CSS / 组件库 ----------
  {
    slug: 'bulma',
    name: 'Bulma',
    languages: ['css'],
    kind: 'framework',
    intro: 'A modern CSS framework based on flexbox.',
    link_url: 'https://bulma.io/',
    logo_url: 'https://cdn.simpleicons.org/bulma'
  },
  {
    slug: 'foundation',
    name: 'Foundation',
    languages: ['css'],
    kind: 'framework',
    intro: 'A family of responsive front-end frameworks for any device.',
    link_url: 'https://get.foundation/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/foundation/foundation-original.svg'
  },
  {
    slug: 'material-ui',
    name: 'Material UI',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'React components implementing Google’s Material Design.',
    link_url: 'https://mui.com/',
    logo_url: 'https://cdn.simpleicons.org/mui'
  },
  {
    slug: 'chakra-ui',
    name: 'Chakra UI',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'Accessible React components with a style-prop API.',
    link_url: 'https://chakra-ui.com/',
    logo_url: 'https://cdn.simpleicons.org/chakraui'
  },
  {
    slug: 'vuetify',
    name: 'Vuetify',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A Material Design component framework for Vue.',
    link_url: 'https://vuetifyjs.com/',
    logo_url: 'https://cdn.simpleicons.org/vuetify'
  },
  {
    slug: 'primevue',
    name: 'PrimeVue',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'A rich UI component suite for Vue with theming support.',
    link_url: 'https://primevue.org/',
    logo_url: 'https://cdn.simpleicons.org/primevue'
  },
  {
    slug: 'ant-design',
    name: 'Ant Design',
    languages: ['javascript', 'typescript'],
    kind: 'framework',
    intro: 'An enterprise-class UI design language and React component library.',
    link_url: 'https://ant.design/',
    logo_url: 'https://cdn.simpleicons.org/antdesign'
  },

  // ---------- 追加批次：JavaScript / TypeScript 库 ----------
  {
    slug: 'tanstack-query',
    name: 'TanStack Query',
    languages: ['typescript', 'javascript'],
    kind: 'library',
    intro: 'Async state management with caching, retries and background refetching.',
    link_url: 'https://tanstack.com/query',
    logo_url: 'https://cdn.simpleicons.org/reactquery'
  },
  {
    slug: 'zustand',
    name: 'Zustand',
    languages: ['typescript', 'javascript'],
    kind: 'library',
    intro: 'A small, fast state store for React built on hooks.',
    link_url: 'https://zustand.docs.pmnd.rs/',
    logo_url: null
  },
  {
    slug: 'mobx',
    name: 'MobX',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Reactive state management that tracks observable data automatically.',
    link_url: 'https://mobx.js.org/',
    logo_url: 'https://cdn.simpleicons.org/mobx'
  },
  {
    slug: 'ramda',
    name: 'Ramda',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A functional utility library with immutable, curried helpers.',
    link_url: 'https://ramdajs.com/',
    logo_url: null
  },
  {
    slug: 'date-fns',
    name: 'date-fns',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Composable date utilities built on native Date.',
    link_url: 'https://date-fns.org/',
    logo_url: 'https://cdn.simpleicons.org/datefns'
  },
  {
    slug: 'dayjs',
    name: 'Day.js',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A tiny, immutable date library with a Moment-compatible API.',
    link_url: 'https://day.js.org/',
    logo_url: null
  },
  {
    slug: 'zod',
    name: 'Zod',
    languages: ['typescript', 'javascript'],
    kind: 'library',
    intro: 'TypeScript-first schema validation with static type inference.',
    link_url: 'https://zod.dev/',
    logo_url: 'https://cdn.simpleicons.org/zod'
  },
  {
    slug: 'jest',
    name: 'Jest',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A batteries-included JavaScript testing framework.',
    link_url: 'https://jestjs.io/',
    logo_url: 'https://cdn.simpleicons.org/jest'
  },
  {
    slug: 'vitest',
    name: 'Vitest',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'A Vite-native test runner with a Jest-compatible API.',
    link_url: 'https://vitest.dev/',
    logo_url: 'https://cdn.simpleicons.org/vitest'
  },
  {
    slug: 'cypress',
    name: 'Cypress',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Fast, reliable end-to-end testing that runs in a real browser.',
    link_url: 'https://www.cypress.io/',
    logo_url: 'https://cdn.simpleicons.org/cypress'
  },
  {
    slug: 'playwright',
    name: 'Playwright',
    languages: ['typescript', 'javascript', 'python'],
    kind: 'library',
    intro: 'Cross-browser automation with one API for Chromium, Firefox and WebKit.',
    link_url: 'https://playwright.dev/',
    logo_url: null
  },
  {
    slug: 'mongoose',
    name: 'Mongoose',
    languages: ['javascript', 'typescript'],
    kind: 'library',
    intro: 'Schema-based modelling for MongoDB in Node.js.',
    link_url: 'https://mongoosejs.com/',
    logo_url: 'https://cdn.simpleicons.org/mongoose'
  },
  {
    slug: 'drizzle-orm',
    name: 'Drizzle ORM',
    languages: ['typescript', 'javascript'],
    kind: 'library',
    intro: 'A lightweight, type-safe SQL ORM for TypeScript.',
    link_url: 'https://orm.drizzle.team/',
    logo_url: 'https://cdn.simpleicons.org/drizzle'
  },

  // ---------- 追加批次：Python 库 ----------
  {
    slug: 'requests',
    name: 'Requests',
    languages: ['python'],
    kind: 'library',
    intro: 'The de facto HTTP client for Python with a human-friendly API.',
    link_url: 'https://requests.readthedocs.io/',
    logo_url: null
  },
  {
    slug: 'beautifulsoup',
    name: 'Beautiful Soup',
    languages: ['python'],
    kind: 'library',
    intro: 'Parsing and navigating HTML and XML documents with ease.',
    link_url: 'https://www.crummy.com/software/BeautifulSoup/',
    logo_url: null
  },
  {
    slug: 'scrapy',
    name: 'Scrapy',
    languages: ['python'],
    kind: 'library',
    intro: 'A fast, high-level web crawling and scraping framework.',
    link_url: 'https://scrapy.org/',
    logo_url: 'https://cdn.simpleicons.org/scrapy'
  },
  {
    slug: 'celery',
    name: 'Celery',
    languages: ['python'],
    kind: 'library',
    intro: 'Distributed task queues for background and scheduled work.',
    link_url: 'https://docs.celeryq.dev/',
    logo_url: 'https://cdn.simpleicons.org/celery'
  },
  {
    slug: 'pillow',
    name: 'Pillow',
    languages: ['python'],
    kind: 'library',
    intro: 'Image processing and format conversion for Python.',
    link_url: 'https://python-pillow.org/',
    logo_url: null
  },
  {
    slug: 'opencv',
    name: 'OpenCV',
    languages: ['python', 'cpp'],
    kind: 'library',
    intro: 'Computer vision algorithms for images and video streams.',
    link_url: 'https://opencv.org/',
    logo_url: 'https://cdn.simpleicons.org/opencv'
  },
  {
    slug: 'spacy',
    name: 'spaCy',
    languages: ['python'],
    kind: 'library',
    intro: 'Production-grade natural language processing pipelines.',
    link_url: 'https://spacy.io/',
    logo_url: 'https://cdn.simpleicons.org/spacy'
  },
  {
    slug: 'transformers',
    name: 'Transformers',
    languages: ['python'],
    kind: 'library',
    intro: 'Pretrained transformer models for text, vision and audio.',
    link_url: 'https://huggingface.co/docs/transformers/',
    logo_url: 'https://cdn.simpleicons.org/huggingface'
  },
  {
    slug: 'sympy',
    name: 'SymPy',
    languages: ['python'],
    kind: 'library',
    intro: 'Symbolic mathematics, from algebra to calculus, in pure Python.',
    link_url: 'https://www.sympy.org/',
    logo_url: 'https://cdn.simpleicons.org/sympy'
  },
  {
    slug: 'aiohttp',
    name: 'aiohttp',
    languages: ['python'],
    kind: 'library',
    intro: 'Asynchronous HTTP client and server built on asyncio.',
    link_url: 'https://docs.aiohttp.org/',
    logo_url: 'https://cdn.simpleicons.org/aiohttp'
  },

  // ---------- 追加批次：Java / Kotlin 库 ----------
  {
    slug: 'jackson',
    name: 'Jackson',
    languages: ['java', 'kotlin'],
    kind: 'library',
    intro: 'High-performance JSON binding and streaming for the JVM.',
    link_url: 'https://github.com/FasterXML/jackson',
    logo_url: null
  },
  {
    slug: 'lombok',
    name: 'Lombok',
    languages: ['java'],
    kind: 'library',
    intro: 'Annotation processor that removes Java boilerplate code.',
    link_url: 'https://projectlombok.org/',
    logo_url: null
  },
  {
    slug: 'mockito',
    name: 'Mockito',
    languages: ['java', 'kotlin'],
    kind: 'library',
    intro: 'Mocking framework for clean, readable unit tests.',
    link_url: 'https://site.mockito.org/',
    logo_url: null
  },
  {
    slug: 'netty',
    name: 'Netty',
    languages: ['java', 'kotlin'],
    kind: 'library',
    intro: 'An asynchronous, event-driven network application framework.',
    link_url: 'https://netty.io/',
    logo_url: null
  },
  {
    slug: 'kotlinx-serialization',
    name: 'kotlinx.serialization',
    languages: ['kotlin'],
    kind: 'library',
    intro: 'Kotlin-native serialisation with compiler-generated codecs.',
    link_url: 'https://kotlinlang.org/docs/serialization.html',
    logo_url: 'https://cdn.simpleicons.org/kotlin'
  },

  // ---------- 追加批次：.NET / Go / Rust / Ruby / PHP / C++ 库 ----------
  {
    slug: 'xunit',
    name: 'xUnit.net',
    languages: ['csharp', 'fsharp'],
    kind: 'library',
    intro: 'A community-focused unit testing tool for the .NET platform.',
    link_url: 'https://xunit.net/',
    logo_url: null
  },
  {
    slug: 'dapper',
    name: 'Dapper',
    languages: ['csharp'],
    kind: 'library',
    intro: 'A micro-ORM that extends IDbConnection with fast object mapping.',
    link_url: 'https://github.com/DapperLib/Dapper',
    logo_url: null
  },
  {
    slug: 'gorm',
    name: 'GORM',
    languages: ['go'],
    kind: 'library',
    intro: 'A developer-friendly ORM for Go with migrations and hooks.',
    link_url: 'https://gorm.io/',
    logo_url: null
  },
  {
    slug: 'testify',
    name: 'Testify',
    languages: ['go'],
    kind: 'library',
    intro: 'Assertions and mocks that make Go tests easier to read.',
    link_url: 'https://github.com/stretchr/testify',
    logo_url: null
  },
  {
    slug: 'serde',
    name: 'Serde',
    languages: ['rust'],
    kind: 'library',
    intro: 'Serialisation and deserialisation framework for Rust data structures.',
    link_url: 'https://serde.rs/',
    logo_url: null
  },
  {
    slug: 'reqwest',
    name: 'Reqwest',
    languages: ['rust'],
    kind: 'library',
    intro: 'An ergonomic, async HTTP client for Rust.',
    link_url: 'https://docs.rs/reqwest/',
    logo_url: null
  },
  {
    slug: 'sqlx',
    name: 'SQLx',
    languages: ['rust'],
    kind: 'library',
    intro: 'Compile-time checked SQL queries without a DSL.',
    link_url: 'https://sqlx.dev/',
    logo_url: null
  },
  {
    slug: 'rspec',
    name: 'RSpec',
    languages: ['ruby'],
    kind: 'library',
    intro: 'Behaviour-driven testing with a readable Ruby DSL.',
    link_url: 'https://rspec.info/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/rspec/rspec-original.svg'
  },
  {
    slug: 'sidekiq',
    name: 'Sidekiq',
    languages: ['ruby'],
    kind: 'library',
    intro: 'Background job processing for Ruby backed by Redis.',
    link_url: 'https://sidekiq.org/',
    logo_url: 'https://cdn.simpleicons.org/sidekiq'
  },
  {
    slug: 'phpunit',
    name: 'PHPUnit',
    languages: ['php'],
    kind: 'library',
    intro: 'The xUnit-style testing framework for PHP.',
    link_url: 'https://phpunit.de/',
    logo_url: null
  },
  {
    slug: 'guzzle',
    name: 'Guzzle',
    languages: ['php'],
    kind: 'library',
    intro: 'A PSR-7 HTTP client with middleware support.',
    link_url: 'https://docs.guzzlephp.org/',
    logo_url: null
  },
  {
    slug: 'boost',
    name: 'Boost',
    languages: ['cpp'],
    kind: 'library',
    intro: 'A large collection of peer-reviewed, portable C++ libraries.',
    link_url: 'https://www.boost.org/',
    logo_url: 'https://cdn.simpleicons.org/boost'
  },
  {
    slug: 'eigen',
    name: 'Eigen',
    languages: ['cpp'],
    kind: 'library',
    intro: 'A header-only library for linear algebra, matrices and solvers.',
    link_url: 'https://eigen.tuxfamily.org/',
    logo_url: null
  },

  // ---------- 追加批次：构建 / 交付 / 数据工具 ----------
  {
    slug: 'turborepo',
    name: 'Turborepo',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A high-performance build system for JavaScript monorepos.',
    link_url: 'https://turborepo.com/',
    logo_url: 'https://cdn.simpleicons.org/turborepo'
  },
  {
    slug: 'nx',
    name: 'Nx',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A build system with caching, graph analysis and generators.',
    link_url: 'https://nx.dev/',
    logo_url: 'https://cdn.simpleicons.org/nx'
  },
  {
    slug: 'lerna',
    name: 'Lerna',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A monorepo manager for versioning and publishing packages.',
    link_url: 'https://lerna.js.org/',
    logo_url: 'https://cdn.simpleicons.org/lerna'
  },
  {
    slug: 'biome',
    name: 'Biome',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'A fast formatter and linter for web projects in one binary.',
    link_url: 'https://biomejs.dev/',
    logo_url: 'https://cdn.simpleicons.org/biome'
  },
  {
    slug: 'tsx',
    name: 'tsx',
    languages: ['typescript', 'javascript'],
    kind: 'tool',
    intro: 'Run TypeScript files directly with esbuild-powered execution.',
    link_url: 'https://www.npmjs.com/package/tsx',
    logo_url: null
  },
  {
    slug: 'nodemon',
    name: 'nodemon',
    languages: ['javascript', 'typescript'],
    kind: 'tool',
    intro: 'Restarts a Node.js process automatically when files change.',
    link_url: 'https://nodemon.io/',
    logo_url: 'https://cdn.simpleicons.org/nodemon'
  },
  {
    slug: 'docker',
    name: 'Docker',
    languages: ['dockerfile', 'shell'],
    kind: 'tool',
    intro: 'Packaging and running applications as portable containers.',
    link_url: 'https://www.docker.com/',
    logo_url: 'https://cdn.simpleicons.org/docker'
  },
  {
    slug: 'kubernetes',
    name: 'Kubernetes',
    languages: ['yaml', 'go'],
    kind: 'tool',
    intro: 'Container orchestration for deploying and scaling services.',
    link_url: 'https://kubernetes.io/',
    logo_url: 'https://cdn.simpleicons.org/kubernetes'
  },
  {
    slug: 'helm',
    name: 'Helm',
    languages: ['yaml', 'go'],
    kind: 'tool',
    intro: 'The package manager for Kubernetes applications.',
    link_url: 'https://helm.sh/',
    logo_url: 'https://cdn.simpleicons.org/helm'
  },
  {
    slug: 'terraform',
    name: 'Terraform',
    languages: ['hcl'],
    kind: 'tool',
    intro: 'Declarative infrastructure provisioning across cloud providers.',
    link_url: 'https://www.terraform.io/',
    logo_url: 'https://cdn.simpleicons.org/terraform'
  },
  {
    slug: 'ansible',
    name: 'Ansible',
    languages: ['yaml', 'python'],
    kind: 'tool',
    intro: 'Agentless configuration management over SSH.',
    link_url: 'https://www.ansible.com/',
    logo_url: 'https://cdn.simpleicons.org/ansible'
  },
  {
    slug: 'github-actions',
    name: 'GitHub Actions',
    languages: ['yaml'],
    kind: 'tool',
    intro: 'CI/CD workflows defined next to the code in a repository.',
    link_url: 'https://github.com/features/actions',
    logo_url: 'https://cdn.simpleicons.org/githubactions'
  },
  {
    slug: 'gitlab-ci',
    name: 'GitLab CI',
    languages: ['yaml'],
    kind: 'tool',
    intro: 'Pipelines and runners built into GitLab.',
    link_url: 'https://docs.gitlab.com/ee/ci/',
    logo_url: 'https://cdn.simpleicons.org/gitlab'
  },
  {
    slug: 'jenkins',
    name: 'Jenkins',
    languages: ['groovy', 'java'],
    kind: 'tool',
    intro: 'A self-hosted automation server with a huge plugin ecosystem.',
    link_url: 'https://www.jenkins.io/',
    logo_url: 'https://cdn.simpleicons.org/jenkins'
  },
  {
    slug: 'airflow',
    name: 'Apache Airflow',
    languages: ['python'],
    kind: 'tool',
    intro: 'Author, schedule and monitor data pipelines as Python code.',
    link_url: 'https://airflow.apache.org/',
    logo_url: 'https://cdn.simpleicons.org/apacheairflow'
  },
  {
    slug: 'jupyter',
    name: 'Jupyter',
    languages: ['python', 'r', 'julia'],
    kind: 'tool',
    intro: 'Interactive notebooks mixing code, output and prose.',
    link_url: 'https://jupyter.org/',
    logo_url: 'https://cdn.simpleicons.org/jupyter'
  },
  {
    slug: 'poetry',
    name: 'Poetry',
    languages: ['python'],
    kind: 'tool',
    intro: 'Dependency management and packaging for Python projects.',
    link_url: 'https://python-poetry.org/',
    logo_url: 'https://cdn.simpleicons.org/poetry'
  },
  {
    slug: 'ruff',
    name: 'Ruff',
    languages: ['python'],
    kind: 'tool',
    intro: 'An extremely fast Python linter and formatter.',
    link_url: 'https://docs.astral.sh/ruff/',
    logo_url: 'https://cdn.simpleicons.org/ruff'
  },
  {
    slug: 'bazel',
    name: 'Bazel',
    languages: ['starlark', 'java', 'cpp'],
    kind: 'tool',
    intro: 'A fast, hermetic build system for large multi-language repositories.',
    link_url: 'https://bazel.build/',
    logo_url: 'https://cdn.simpleicons.org/bazel'
  },
  {
    slug: 'make',
    name: 'GNU Make',
    languages: ['makefile', 'c', 'cpp'],
    kind: 'tool',
    intro: 'The classic build automation tool driven by dependency rules.',
    link_url: 'https://www.gnu.org/software/make/',
    logo_url: 'https://cdn.simpleicons.org/gnu'
  },
  {
    slug: 'cucumber',
    name: 'Cucumber',
    languages: ['gherkin', 'java', 'javascript', 'ruby'],
    kind: 'tool',
    intro: 'Executable specifications written in plain language.',
    link_url: 'https://cucumber.io/',
    logo_url: 'https://cdn.simpleicons.org/cucumber'
  },

  // ---------- 追加批次：运行时 ----------
  {
    slug: 'jvm',
    name: 'JVM',
    languages: ['java', 'kotlin', 'scala'],
    kind: 'runtime',
    intro: 'The virtual machine that runs Java, Kotlin, Scala and more.',
    link_url: 'https://openjdk.org/',
    logo_url: 'https://cdn.simpleicons.org/openjdk'
  },
  {
    slug: 'pypy',
    name: 'PyPy',
    languages: ['python'],
    kind: 'runtime',
    intro: 'A fast, JIT-compiling alternative implementation of Python.',
    link_url: 'https://pypy.org/',
    logo_url: 'https://cdn.simpleicons.org/pypy'
  },
  {
    slug: 'beam',
    name: 'BEAM',
    languages: ['erlang', 'elixir', 'gleam'],
    kind: 'runtime',
    intro: 'The Erlang virtual machine behind fault-tolerant, concurrent systems.',
    link_url: 'https://www.erlang.org/',
    logo_url: 'https://cdn.simpleicons.org/erlang'
  },
  {
    slug: 'v8',
    name: 'V8',
    languages: ['javascript', 'typescript'],
    kind: 'runtime',
    intro: 'Google’s high-performance JavaScript engine used by Node.js, Chromium and Deno.',
    link_url: 'https://v8.dev/',
    logo_url: 'https://cdn.simpleicons.org/v8'
  },
  {
    slug: 'hermes',
    name: 'Hermes',
    languages: ['javascript'],
    kind: 'runtime',
    intro: 'A small JavaScript engine optimised for React Native on mobile.',
    link_url: 'https://hermesengine.dev/',
    logo_url: null
  },
  {
    slug: 'luajit',
    name: 'LuaJIT',
    languages: ['lua'],
    kind: 'runtime',
    intro: 'A just-in-time compiler for Lua that runs scripts many times faster.',
    link_url: 'https://luajit.org/',
    logo_url: null
  },
  {
    slug: 'micropython',
    name: 'MicroPython',
    languages: ['python'],
    kind: 'runtime',
    intro: 'A lean Python implementation for microcontrollers and small devices.',
    link_url: 'https://micropython.org/',
    logo_url: 'https://cdn.simpleicons.org/micropython'
  },
  {
    slug: 'wasmtime',
    name: 'Wasmtime',
    languages: ['webassembly', 'rust'],
    kind: 'runtime',
    intro: 'A fast, secure runtime for WebAssembly outside the browser.',
    link_url: 'https://wasmtime.dev/',
    logo_url: null
  }
]
