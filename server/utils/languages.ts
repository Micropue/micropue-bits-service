// 系统预置编程语言：数据库检测时缺失即补齐、字段为空即回填，已存在的内容不覆盖
// logo_url 使用公共 CDN：Simple Icons（cdn.simpleicons.org）与 Devicon（unpkg.com/devicon，版本已钉死）
// 顺序即代码段创建时的展示顺序（sort_order = 下标 × 10）
// 规范详见 项目综合设计.md「二、数据结构与开发规范」

export interface LanguageSeed {
  slug: string
  name: string
  intro: string
  link_url: string
  logo_url: string | null
}

export const LANGUAGE_SEED: LanguageSeed[] = [
  {
    slug: 'javascript',
    name: 'JavaScript',
    intro: 'The scripting language of the web, used for interactive pages, servers and tooling.',
    link_url: 'https://developer.mozilla.org/docs/Web/JavaScript',
    logo_url: 'https://cdn.simpleicons.org/javascript'
  },
  {
    slug: 'typescript',
    name: 'TypeScript',
    intro: 'A typed superset of JavaScript that compiles to plain JavaScript.',
    link_url: 'https://www.typescriptlang.org/',
    logo_url: 'https://cdn.simpleicons.org/typescript'
  },
  {
    slug: 'python',
    name: 'Python',
    intro: 'A readable general-purpose language popular in data, AI, automation and backends.',
    link_url: 'https://www.python.org/',
    logo_url: 'https://cdn.simpleicons.org/python'
  },
  {
    slug: 'java',
    name: 'Java',
    intro: 'A class-based, object-oriented language built to run anywhere on the JVM.',
    link_url: 'https://dev.java/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/java/java-original.svg'
  },
  {
    slug: 'c',
    name: 'C',
    intro: 'A small, low-level language that underpins operating systems and embedded software.',
    link_url: 'https://en.cppreference.com/w/c',
    logo_url: 'https://cdn.simpleicons.org/c'
  },
  {
    slug: 'cpp',
    name: 'C++',
    intro: 'A high-performance language adding objects and generics to C without runtime overhead.',
    link_url: 'https://isocpp.org/',
    logo_url: 'https://cdn.simpleicons.org/cplusplus'
  },
  {
    slug: 'csharp',
    name: 'C#',
    intro: 'A modern object-oriented language for the .NET platform.',
    link_url: 'https://learn.microsoft.com/dotnet/csharp/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/csharp/csharp-original.svg'
  },
  {
    slug: 'go',
    name: 'Go',
    intro: 'A statically typed language for simple, concurrent and efficient services.',
    link_url: 'https://go.dev/',
    logo_url: 'https://cdn.simpleicons.org/go'
  },
  {
    slug: 'rust',
    name: 'Rust',
    intro: 'A systems language with compile-time memory safety and no garbage collector.',
    link_url: 'https://www.rust-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/rust'
  },
  {
    slug: 'php',
    name: 'PHP',
    intro: 'A server-side language that powers a large share of the web.',
    link_url: 'https://www.php.net/',
    logo_url: 'https://cdn.simpleicons.org/php'
  },
  {
    slug: 'ruby',
    name: 'Ruby',
    intro: 'A dynamic, elegant language designed for developer happiness.',
    link_url: 'https://www.ruby-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/ruby'
  },
  {
    slug: 'swift',
    name: 'Swift',
    intro: 'The language for iOS, macOS and server-side development.',
    link_url: 'https://www.swift.org/',
    logo_url: 'https://cdn.simpleicons.org/swift'
  },
  {
    slug: 'kotlin',
    name: 'Kotlin',
    intro: 'A concise, null-safe language for Android, the JVM and multiplatform code.',
    link_url: 'https://kotlinlang.org/',
    logo_url: 'https://cdn.simpleicons.org/kotlin'
  },
  {
    slug: 'scala',
    name: 'Scala',
    intro: 'A JVM language that blends object-oriented and functional programming.',
    link_url: 'https://www.scala-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/scala'
  },
  {
    slug: 'dart',
    name: 'Dart',
    intro: 'A client-optimized language for fast apps on mobile, web and desktop.',
    link_url: 'https://dart.dev/',
    logo_url: 'https://cdn.simpleicons.org/dart'
  },
  {
    slug: 'r',
    name: 'R',
    intro: 'A language and environment for statistical computing and graphics.',
    link_url: 'https://www.r-project.org/',
    logo_url: 'https://cdn.simpleicons.org/r'
  },
  {
    slug: 'matlab',
    name: 'MATLAB',
    intro: 'A numeric computing environment for matrix maths, modelling and simulation.',
    link_url: 'https://www.mathworks.com/products/matlab.html',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/matlab/matlab-original.svg'
  },
  {
    slug: 'lua',
    name: 'Lua',
    intro: 'A lightweight, embeddable scripting language popular in games and tooling.',
    link_url: 'https://www.lua.org/',
    logo_url: 'https://cdn.simpleicons.org/lua'
  },
  {
    slug: 'perl',
    name: 'Perl',
    intro: 'A mature text-processing language known for powerful regular expressions.',
    link_url: 'https://www.perl.org/',
    logo_url: 'https://cdn.simpleicons.org/perl'
  },
  {
    slug: 'julia',
    name: 'Julia',
    intro: 'A high-level language built for fast technical and scientific computing.',
    link_url: 'https://julialang.org/',
    logo_url: 'https://cdn.simpleicons.org/julia'
  },
  {
    slug: 'haskell',
    name: 'Haskell',
    intro: 'A purely functional language with strong static typing.',
    link_url: 'https://www.haskell.org/',
    logo_url: 'https://cdn.simpleicons.org/haskell'
  },
  {
    slug: 'elixir',
    name: 'Elixir',
    intro: 'A functional language for scalable, fault-tolerant systems on the Erlang VM.',
    link_url: 'https://elixir-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/elixir'
  },
  {
    slug: 'erlang',
    name: 'Erlang',
    intro: 'A language built for massively concurrent and fault-tolerant systems.',
    link_url: 'https://www.erlang.org/',
    logo_url: 'https://cdn.simpleicons.org/erlang'
  },
  {
    slug: 'clojure',
    name: 'Clojure',
    intro: 'A Lisp dialect for the JVM with immutable data and concurrency support.',
    link_url: 'https://clojure.org/',
    logo_url: 'https://cdn.simpleicons.org/clojure'
  },
  {
    slug: 'groovy',
    name: 'Groovy',
    intro: 'A dynamic JVM language with concise, DSL-friendly syntax.',
    link_url: 'https://groovy-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/apachegroovy'
  },
  {
    slug: 'fsharp',
    name: 'F#',
    intro: 'A functional-first .NET language for concise, type-safe code.',
    link_url: 'https://fsharp.org/',
    logo_url: 'https://cdn.simpleicons.org/fsharp'
  },
  {
    slug: 'ocaml',
    name: 'OCaml',
    intro: 'A functional language with a strong type system and native performance.',
    link_url: 'https://ocaml.org/',
    logo_url: 'https://cdn.simpleicons.org/ocaml'
  },
  {
    slug: 'nim',
    name: 'Nim',
    intro: 'A statically typed language that compiles to C, C++ or JavaScript.',
    link_url: 'https://nim-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/nim'
  },
  {
    slug: 'zig',
    name: 'Zig',
    intro: 'A low-level language focused on performance, safety and C interoperability.',
    link_url: 'https://ziglang.org/',
    logo_url: 'https://cdn.simpleicons.org/zig'
  },
  {
    slug: 'crystal',
    name: 'Crystal',
    intro: 'A Ruby-like language compiled to fast native code.',
    link_url: 'https://crystal-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/crystal'
  },
  {
    slug: 'solidity',
    name: 'Solidity',
    intro: 'A language for writing smart contracts on the Ethereum Virtual Machine.',
    link_url: 'https://soliditylang.org/',
    logo_url: 'https://cdn.simpleicons.org/solidity'
  },
  {
    slug: 'objective-c',
    name: 'Objective-C',
    intro: 'The C-based language historically used for Apple platform development.',
    link_url: 'https://developer.apple.com/documentation/objectivec',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/objectivec/objectivec-plain.svg'
  },
  {
    slug: 'visual-basic',
    name: 'Visual Basic',
    intro: 'A friendly, BASIC-derived language for the .NET platform.',
    link_url: 'https://learn.microsoft.com/dotnet/visual-basic/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/visualbasic/visualbasic-original.svg'
  },
  {
    slug: 'delphi',
    name: 'Delphi',
    intro: 'A Pascal-based language with a rapid application development toolchain.',
    link_url: 'https://www.embarcadero.com/products/delphi',
    logo_url: 'https://cdn.simpleicons.org/delphi'
  },
  {
    slug: 'fortran',
    name: 'Fortran',
    intro: 'A scientific computing language still widely used for numerical work.',
    link_url: 'https://fortran-lang.org/',
    logo_url: 'https://cdn.simpleicons.org/fortran'
  },
  {
    slug: 'cobol',
    name: 'COBOL',
    intro: 'A business-oriented language still running much of the finance and government infrastructure.',
    link_url: 'https://developer.ibm.com/languages/cobol/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/cobol/cobol-original.svg'
  },
  {
    slug: 'prolog',
    name: 'Prolog',
    intro: 'A logic programming language used for AI, natural language and knowledge systems.',
    link_url: 'https://www.swi-prolog.org/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/prolog/prolog-original.svg'
  },
  {
    slug: 'shell',
    name: 'Shell',
    intro: 'The command-line scripting family used for automation and system tooling.',
    link_url: 'https://www.gnu.org/software/bash/',
    logo_url: 'https://cdn.simpleicons.org/gnubash'
  },
  {
    slug: 'powershell',
    name: 'PowerShell',
    intro: 'A cross-platform shell and automation framework from Microsoft.',
    link_url: 'https://learn.microsoft.com/powershell/',
    logo_url: 'https://unpkg.com/devicon@2.17.0/icons/powershell/powershell-original.svg'
  },
  {
    slug: 'html',
    name: 'HTML',
    intro: 'The markup language that structures content on the web.',
    link_url: 'https://developer.mozilla.org/docs/Web/HTML',
    logo_url: 'https://cdn.simpleicons.org/html5'
  },
  {
    slug: 'css',
    name: 'CSS',
    intro: 'The style language that lays out and decorates web pages.',
    link_url: 'https://developer.mozilla.org/docs/Web/CSS',
    logo_url: 'https://cdn.simpleicons.org/css'
  },
  {
    slug: 'scss',
    name: 'SCSS',
    intro: 'A CSS preprocessor adding variables, nesting and mixins.',
    link_url: 'https://sass-lang.com/',
    logo_url: 'https://cdn.simpleicons.org/sass'
  },
  {
    slug: 'less',
    name: 'Less',
    intro: 'A CSS preprocessor with variables, mixins and nested rules.',
    link_url: 'https://lesscss.org/',
    logo_url: 'https://cdn.simpleicons.org/less'
  },
  {
    slug: 'markdown',
    name: 'Markdown',
    intro: 'A lightweight markup language for formatted plain-text documents.',
    link_url: 'https://commonmark.org/',
    logo_url: 'https://cdn.simpleicons.org/markdown'
  },
  {
    slug: 'json',
    name: 'JSON',
    intro: 'A minimal text format for structured data interchange.',
    link_url: 'https://www.json.org/',
    logo_url: 'https://cdn.simpleicons.org/json'
  },
  {
    slug: 'yaml',
    name: 'YAML',
    intro: 'A human-friendly format for configuration and structured data.',
    link_url: 'https://yaml.org/',
    logo_url: 'https://cdn.simpleicons.org/yaml'
  },
  {
    slug: 'dockerfile',
    name: 'Dockerfile',
    intro: 'A build recipe describing how to assemble a container image.',
    link_url: 'https://docs.docker.com/reference/dockerfile/',
    logo_url: 'https://cdn.simpleicons.org/docker'
  },
  {
    slug: 'vim-script',
    name: 'Vim Script',
    intro: 'The scripting language used to configure and extend Vim.',
    link_url: 'https://www.vim.org/',
    logo_url: 'https://cdn.simpleicons.org/vim'
  },
  {
    slug: 'makefile',
    name: 'Makefile',
    intro: 'Build automation rules for compiling and assembling projects.',
    link_url: 'https://www.gnu.org/software/make/',
    logo_url: 'https://cdn.simpleicons.org/make'
  },
  {
    slug: 'sql',
    name: 'SQL',
    intro: 'The standard language for querying and managing relational databases.',
    link_url: 'https://www.w3schools.com/sql/',
    logo_url: null
  }
]
