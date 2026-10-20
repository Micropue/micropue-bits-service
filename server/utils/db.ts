import mysql, { type RowDataPacket } from 'mysql2/promise'
import { randomUUID } from 'node:crypto'
import { shortId } from './id'
import { LANGUAGE_SEED } from './languages'
import { DEPENDENCY_SEED } from './dependencies'

// 用户账户表：所有用户数据统一存这一张表，以账户 UUID 作为唯一标识
// 规范详见 项目综合设计.md「二、数据结构与开发规范」
const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`users\` (
  \`uuid\` CHAR(36) NOT NULL COMMENT '账户UUID（标准UUID格式，唯一标识，不可更改）',
  \`email\` VARCHAR(254) NOT NULL COMMENT '电子邮件（唯一，大小写不敏感）',
  \`username\` VARCHAR(254) NOT NULL COMMENT '用户名（唯一，大小写不敏感；注册默认=电子邮件，一旦设置不可修改）',
  \`email_verified_at\` DATETIME NULL COMMENT '电子邮件真实性验证通过时间',
  \`nickname\` VARCHAR(20) NOT NULL COMMENT '昵称（2-20位，仅数字/字母/下划线/短横线）',
  \`bio\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '个人介绍',
  \`github_id\` BIGINT UNSIGNED NULL COMMENT 'Github账户ID（一对一绑定）',
  \`github_login\` VARCHAR(39) NULL COMMENT 'Github 用户名（绑定后展示）',
  \`password_hash\` VARCHAR(255) NULL COMMENT '密码哈希（Argon2id/bcrypt/scrypt，禁止明文或普通SHA256）',
  \`totp_secret\` VARCHAR(255) NULL COMMENT 'AuthApp(TOTP)密钥密文（AES-256-GCM）；存在=已绑定',
  \`two_factor_enabled\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '两步验证开关（0/1）',
  \`recovery_codes\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '恢复码列表（仅存哈希）[{hash,usedAt}]',
  \`passkeys\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'Passkey通行密钥列表 [{credentialId,publicKey,...}]',
  \`last_login_at\` DATETIME NULL COMMENT '最近登录时间（每次新登录会话产生时覆盖）',
  \`login_devices\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '登录设备列表 [{type,name,token,loginAt}]',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  \`status\` ENUM('normal','disabled') NOT NULL DEFAULT 'normal' COMMENT '账户状态（正常/禁用，客户端不可修改）',
  \`disabled_at\` DATETIME NULL COMMENT '禁用时间（NULL=未禁用）',
  \`disabled_by\` CHAR(36) NULL COMMENT '执行禁用的管理员UUID',
  \`disabled_reason\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '禁用原因（供客服追溯）',
  PRIMARY KEY (\`uuid\`),
  UNIQUE KEY \`uk_users_email\` (\`email\`),
  UNIQUE KEY \`uk_users_username\` (\`username\`),
  UNIQUE KEY \`uk_users_github_id\` (\`github_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账户表';
`

// 幂等迁移：为已存在的旧表补充 status 列
const USERS_STATUS_MIGRATION_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`status\` ENUM('normal','disabled') NOT NULL DEFAULT 'normal'
  COMMENT '账户状态（正常/禁用，客户端不可修改）' AFTER \`created_at\`
`

// 幂等迁移：为旧表补充 username 列（默认回填为电子邮件），并建立唯一索引
const USERS_USERNAME_ADD_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`username\` VARCHAR(254) NULL
  COMMENT '用户名（唯一，大小写不敏感；注册默认=电子邮件，一旦设置不可修改）' AFTER \`email\`
`
const USERS_USERNAME_BACKFILL_SQL = `UPDATE \`users\` SET \`username\` = \`email\` WHERE \`username\` IS NULL`
const USERS_USERNAME_NOTNULL_SQL = `
ALTER TABLE \`users\`
  MODIFY COLUMN \`username\` VARCHAR(254) NOT NULL
  COMMENT '用户名（唯一，大小写不敏感；注册默认=电子邮件，一旦设置不可修改）'
`
const USERS_USERNAME_INDEX_SQL = `ALTER TABLE \`users\` ADD UNIQUE KEY \`uk_users_username\` (\`username\`)`

// 幂等迁移：为旧表补充 github_login 列（展示 Github 用户名）
const USERS_GITHUB_LOGIN_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`github_login\` VARCHAR(39) NULL
  COMMENT 'Github 用户名（绑定后展示）' AFTER \`github_id\`
`

// 幂等迁移：两步验证相关列
const USERS_TOTP_SECRET_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`totp_secret\` VARCHAR(255) NULL
  COMMENT 'AuthApp(TOTP)密钥密文（AES-256-GCM）；存在=已绑定' AFTER \`password_hash\`
`
const USERS_TWO_FACTOR_ENABLED_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`two_factor_enabled\` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '两步验证开关（0/1）' AFTER \`totp_secret\`
`
const USERS_RECOVERY_CODES_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`recovery_codes\` JSON NOT NULL DEFAULT (JSON_ARRAY())
  COMMENT '恢复码列表（仅存哈希）[{hash,usedAt}]' AFTER \`two_factor_enabled\`
`

// 幂等迁移：为旧表补充 bio 列（个人介绍）
const USERS_BIO_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`bio\` VARCHAR(500) NOT NULL DEFAULT ''
  COMMENT '个人介绍' AFTER \`nickname\`
`

// 幂等迁移：后台用户管理（禁用时间 / 操作人 / 原因）
const USERS_DISABLED_AT_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`disabled_at\` DATETIME NULL
  COMMENT '禁用时间（NULL=未禁用）' AFTER \`status\`
`
const USERS_DISABLED_BY_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`disabled_by\` CHAR(36) NULL
  COMMENT '执行禁用的管理员UUID' AFTER \`disabled_at\`
`
const USERS_DISABLED_REASON_SQL = `
ALTER TABLE \`users\`
  ADD COLUMN \`disabled_reason\` VARCHAR(255) NOT NULL DEFAULT ''
  COMMENT '禁用原因（供客服追溯）' AFTER \`disabled_by\`
`
const USERS_STATUS_INDEX_SQL = `ALTER TABLE \`users\` ADD KEY \`idx_users_status\` (\`status\`, \`created_at\`)`

// 短 UUID 列定义：所有内容表的主键与外键统一使用（生成见 server/utils/id.ts）
const SID = 'CHAR(16) CHARACTER SET ascii COLLATE ascii_bin'

// 内容管理系统数据表（幂等建表），规范详见 项目综合设计.md「二、数据结构与开发规范」
// 引用规则：指向用户 → *_uuid CHAR(36)（与 users.uuid 同字符集）；指向内容 → *_sid；两者都可能 → target_kind + target_ref
const CONTENT_TABLES_SQL: string[] = [
  // 用户开放链接
  `CREATE TABLE IF NOT EXISTS \`user_links\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`user_uuid\` CHAR(36) NOT NULL COMMENT '账户UUID',
    \`platform\` VARCHAR(32) NOT NULL COMMENT '平台键（github/website/... 或 custom）',
    \`label\` VARCHAR(32) NOT NULL COMMENT '展示名称',
    \`url\` VARCHAR(512) NOT NULL COMMENT '链接地址',
    \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    KEY \`idx_user_links_user\` (\`user_uuid\`,\`sort_order\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户开放链接表'`,

  // 用户流量统计（统计数据不作账户基础数据）
  `CREATE TABLE IF NOT EXISTS \`user_stats\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`user_uuid\` CHAR(36) NOT NULL COMMENT '账户UUID',
    \`follower_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '粉丝量',
    \`following_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '关注量',
    \`received_favorite_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '内容被收藏量',
    \`received_copy_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '内容被拷贝量',
    \`snippet_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '代码段数量',
    \`group_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '分组数量',
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_user_stats_user\` (\`user_uuid\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户流量统计表'`,

  // 编程语言（系统维护，代码段必选其一）
  `CREATE TABLE IF NOT EXISTS \`languages\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`slug\` VARCHAR(32) NOT NULL COMMENT '标识（小写，如 typescript）',
    \`name\` VARCHAR(64) NOT NULL COMMENT '语言名称',
    \`logo_url\` VARCHAR(512) NULL COMMENT 'LOGO地址',
    \`intro\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '语言介绍',
    \`link_url\` VARCHAR(512) NULL COMMENT '外部链接',
    \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_languages_slug\` (\`slug\`),
    UNIQUE KEY \`uk_languages_name\` (\`name\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='编程语言表'`,

  // 依赖/框架目录（系统维护；框架与库同表，用 kind 区分）
  `CREATE TABLE IF NOT EXISTS \`dependencies\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`slug\` VARCHAR(40) NOT NULL COMMENT '标识（全局唯一，用于检索与页面链接）',
    \`name\` VARCHAR(64) NOT NULL COMMENT '名称',
    \`kind\` ENUM('framework','library','tool','runtime') NOT NULL DEFAULT 'library' COMMENT '技术类型（框架/库/工具/运行时）',
    \`intro\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '介绍',
    \`logo_url\` VARCHAR(512) NULL COMMENT 'LOGO地址',
    \`link_url\` VARCHAR(512) NULL COMMENT '外部链接',
    \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_dependencies_slug\` (\`slug\`),
    KEY \`idx_dependencies_kind\` (\`kind\`,\`sort_order\`),
    KEY \`idx_dependencies_name\` (\`name\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='依赖/框架目录表'`,

  // 依赖-编程语言关联（多对多：一个条目可适用多种语言，首项为提交顺序里的主语言）
  `CREATE TABLE IF NOT EXISTS \`dependency_languages\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`dependency_sid\` ${SID} NOT NULL COMMENT '依赖/框架条目短UUID',
    \`language_sid\` ${SID} NOT NULL COMMENT '编程语言短UUID',
    \`is_primary\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '主语言（1=卡面展示与默认归属）',
    \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_dependency_languages\` (\`dependency_sid\`,\`language_sid\`),
    KEY \`idx_dependency_languages_language\` (\`language_sid\`,\`sort_order\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='依赖-编程语言关联表'`,

  // 标签（tag_key 为规范化键，name 为展示名）
  `CREATE TABLE IF NOT EXISTS \`tags\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`tag_key\` VARCHAR(32) NOT NULL COMMENT '规范化键（小写、短横线）',
    \`name\` VARCHAR(32) NOT NULL COMMENT '展示名',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_tags_key\` (\`tag_key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表'`,

  // 内容表：代码段与分组共享用户目录命名空间 /[username]/{slug}
  `CREATE TABLE IF NOT EXISTS \`contents\` (
    \`sid\` ${SID} NOT NULL COMMENT '内容短UUID',
    \`owner_uuid\` CHAR(36) NOT NULL COMMENT '作者账户UUID',
    \`kind\` ENUM('snippet','group') NOT NULL COMMENT '内容类型（snippet=代码段 group=分组）',
    \`slug\` VARCHAR(40) NOT NULL COMMENT '目录名（用户内唯一，可修改；改名留别名重定向）',
    \`name\` VARCHAR(60) NOT NULL COMMENT '名称',
    \`intro\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '介绍',
    \`visibility\` ENUM('public','private','unlisted') NOT NULL DEFAULT 'private' COMMENT '公开/私有/不可搜索',
    \`pinned_at\` DATETIME NULL COMMENT '置顶时间（NULL=未置顶，多个置顶按此倒序）',
    \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '个人内容拖拽排序',
    \`fork_from_sid\` ${SID} NULL COMMENT 'Fork来源内容短UUID',
    \`group_sid\` ${SID} NULL COMMENT '所属分组短UUID（仅代码段）',
    \`language_sid\` ${SID} NULL COMMENT '主要编程语言短UUID（仅代码段）',
    \`code\` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '代码内容（仅代码段，应用层限制1MB）',
    \`favorite_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '收藏量',
    \`copy_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '拷贝量',
    \`fork_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Fork量',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间',
    \`deleted_at\` DATETIME NULL COMMENT '删除时间（非空=已删除，原地址410）',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_contents_owner_slug\` (\`owner_uuid\`,\`slug\`),
    KEY \`idx_contents_owner\` (\`owner_uuid\`,\`kind\`,\`deleted_at\`),
    KEY \`idx_contents_group\` (\`group_sid\`),
    KEY \`idx_contents_language\` (\`language_sid\`),
    KEY \`idx_contents_explore\` (\`kind\`,\`visibility\`,\`deleted_at\`,\`created_at\`),
    CONSTRAINT \`chk_contents_kind\` CHECK (
      (\`kind\` = 'snippet' AND \`language_sid\` IS NOT NULL AND \`code\` <> '')
      OR (\`kind\` = 'group' AND \`language_sid\` IS NULL AND \`group_sid\` IS NULL AND \`code\` = '')
    )
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容表（代码段+分组，共享用户目录命名空间）'`,

  // 内容历史目录名：改名后旧链接 301 重定向
  `CREATE TABLE IF NOT EXISTS \`content_aliases\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`owner_uuid\` CHAR(36) NOT NULL COMMENT '内容作者账户UUID',
    \`slug\` VARCHAR(40) NOT NULL COMMENT '历史目录名',
    \`content_sid\` ${SID} NOT NULL COMMENT '当前内容短UUID',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '重定向登记时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_content_aliases_owner_slug\` (\`owner_uuid\`,\`slug\`),
    KEY \`idx_content_aliases_content\` (\`content_sid\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容历史目录名表'`,

  // 内容-标签关联
  `CREATE TABLE IF NOT EXISTS \`content_tags\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`content_sid\` ${SID} NOT NULL COMMENT '内容短UUID',
    \`tag_sid\` ${SID} NOT NULL COMMENT '标签短UUID',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_content_tags\` (\`content_sid\`,\`tag_sid\`),
    KEY \`idx_content_tags_tag\` (\`tag_sid\`,\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容标签关联表'`,

  // 代码段-依赖关联
  `CREATE TABLE IF NOT EXISTS \`snippet_dependencies\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`snippet_sid\` ${SID} NOT NULL COMMENT '代码段内容短UUID',
    \`dependency_sid\` ${SID} NOT NULL COMMENT '依赖短UUID',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_snippet_deps\` (\`snippet_sid\`,\`dependency_sid\`),
    KEY \`idx_snippet_deps_dep\` (\`dependency_sid\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码段依赖关联表'`,

  // 收藏（代码段/分组，不复制内容）
  `CREATE TABLE IF NOT EXISTS \`favorites\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`user_uuid\` CHAR(36) NOT NULL COMMENT '账户UUID',
    \`content_sid\` ${SID} NOT NULL COMMENT '内容短UUID',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_favorites\` (\`user_uuid\`,\`content_sid\`),
    KEY \`idx_favorites_content\` (\`content_sid\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表'`,

  // 关注关系
  `CREATE TABLE IF NOT EXISTS \`follows\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`follower_uuid\` CHAR(36) NOT NULL COMMENT '关注者账户UUID',
    \`followee_uuid\` CHAR(36) NOT NULL COMMENT '被关注者账户UUID',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '关注时间',
    PRIMARY KEY (\`sid\`),
    UNIQUE KEY \`uk_follows\` (\`follower_uuid\`,\`followee_uuid\`),
    KEY \`idx_follows_followee\` (\`followee_uuid\`,\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关注关系表'`,

  // 内容反馈（轻量，不做 Issue 系统）
  `CREATE TABLE IF NOT EXISTS \`feedback\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`user_uuid\` CHAR(36) NOT NULL COMMENT '提交者账户UUID',
    \`content_sid\` ${SID} NOT NULL COMMENT '内容短UUID',
    \`type\` VARCHAR(32) NOT NULL COMMENT '预设类型键（应用常量）',
    \`detail\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '反馈说明',
    \`status\` ENUM('open','read','closed') NOT NULL DEFAULT 'open' COMMENT '处理状态',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    PRIMARY KEY (\`sid\`),
    KEY \`idx_feedback_content\` (\`content_sid\`,\`created_at\`),
    KEY \`idx_feedback_user\` (\`user_uuid\`,\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容反馈表'`,

  // 举报（可举报用户/内容，进后台处理）
  `CREATE TABLE IF NOT EXISTS \`reports\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`reporter_uuid\` CHAR(36) NOT NULL COMMENT '举报者账户UUID',
    \`target_kind\` ENUM('user','content') NOT NULL COMMENT '举报对象类型',
    \`target_ref\` VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '举报对象（账户UUID或内容短UUID）',
    \`type\` VARCHAR(32) NOT NULL COMMENT '预设类型键（应用常量）',
    \`detail\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '举报说明',
    \`status\` ENUM('pending','ignored','removed','restricted') NOT NULL DEFAULT 'pending' COMMENT '处理状态',
    \`handler_uuid\` CHAR(36) NULL COMMENT '处理管理员账户UUID',
    \`handled_at\` DATETIME NULL COMMENT '处理时间',
    \`result\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '处理结果说明',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '举报时间',
    PRIMARY KEY (\`sid\`),
    KEY \`idx_reports_status\` (\`status\`,\`created_at\`),
    KEY \`idx_reports_target\` (\`target_kind\`,\`target_ref\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='举报表'`,

  // 通知（只记必要信息，不做消息流）
  `CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`user_uuid\` CHAR(36) NOT NULL COMMENT '接收者账户UUID',
    \`type\` ENUM('follow','feedback','report_result','fork') NOT NULL COMMENT '通知类型',
    \`actor_uuid\` CHAR(36) NULL COMMENT '触发者账户UUID',
    \`target_kind\` ENUM('user','content') NULL COMMENT '目标类型',
    \`target_ref\` VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '目标（账户UUID或内容短UUID）',
    \`read_at\` DATETIME NULL COMMENT '已读时间',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (\`sid\`),
    KEY \`idx_notifications_user\` (\`user_uuid\`,\`read_at\`,\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表'`,

  // 目录条目申请（用户提交「新语言 / 新依赖」，后台审核通过时补全信息并发布）
  // 用户只填最核心的信息，其余字段由审核管理员在通过前补齐
  `CREATE TABLE IF NOT EXISTS \`catalog_requests\` (
    \`sid\` ${SID} NOT NULL COMMENT '短UUID',
    \`kind\` ENUM('language','dependency') NOT NULL COMMENT '申请类型（语言/依赖）',
    \`status\` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
    \`user_uuid\` CHAR(36) NOT NULL COMMENT '申请人账户UUID',
    \`contact_email\` VARCHAR(254) NOT NULL COMMENT '联系邮箱（提交时的账户邮箱）',
    \`name\` VARCHAR(64) NOT NULL COMMENT '名称（用户填写）',
    \`link_url\` VARCHAR(512) NOT NULL COMMENT 'Official Website（用户填写）',
    \`dependency_kind\` ENUM('framework','library','tool','runtime') NULL COMMENT '依赖类型（仅依赖申请）',
    \`language_sids\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '适用语言短UUID列表（仅依赖申请，首项为主语言）',
    \`reject_reason\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '驳回原因',
    \`reviewed_by\` CHAR(36) NULL COMMENT '审核管理员UUID',
    \`reviewed_at\` DATETIME NULL COMMENT '审核时间',
    \`published_sid\` ${SID} NULL COMMENT '通过后生成的目录条目短UUID',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    PRIMARY KEY (\`sid\`),
    KEY \`idx_catalog_requests_queue\` (\`kind\`,\`status\`,\`created_at\`),
    KEY \`idx_catalog_requests_user\` (\`user_uuid\`,\`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='目录条目申请表'`
]

// 后台系统（Bits System Console）数据表（幂等建表）
// 与前台 users 表完全独立：管理员不属于前台用户体系，登录邮箱也不要求是注册用户
// 规范详见 docs-internal/Bits System Console 开发设计规范.md
const ADMIN_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS \`admins\` (
    \`uuid\` CHAR(36) NOT NULL COMMENT '管理员UUID',
    \`email\` VARCHAR(254) NOT NULL COMMENT '登录邮箱（唯一，存小写）',
    \`name\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '显示名称（留空则展示邮箱）',
    \`permissions\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '权限点列表（逐人配置，无用户组）',
    \`totp_secret\` VARCHAR(255) NULL COMMENT 'AuthApp(TOTP)密钥密文（AES-256-GCM）；存在=已绑定',
    \`passkeys\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'Passkey 列表 [{id,publicKey,counter,...}]；非空=已绑定',
    \`status\` ENUM('normal','disabled') NOT NULL DEFAULT 'normal' COMMENT '状态（禁用后无法登录）',
    \`last_login_at\` DATETIME NULL COMMENT '最近登录时间',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    PRIMARY KEY (\`uuid\`),
    UNIQUE KEY \`uk_admins_email\` (\`email\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台管理员表'`,

  // 会话落库（JWT 内只带 sid）：退出登录、禁用管理员、删除会话都能立即失效
  `CREATE TABLE IF NOT EXISTS \`admin_sessions\` (
    \`sid\` CHAR(36) NOT NULL COMMENT '会话ID（写入控制台 JWT Cookie）',
    \`admin_uuid\` CHAR(36) NOT NULL COMMENT '管理员UUID',
    \`user_agent\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '登录设备 User-Agent',
    \`ip\` VARCHAR(45) NOT NULL DEFAULT '' COMMENT '登录 IP',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
    \`expires_at\` DATETIME NOT NULL COMMENT '失效时间（登录后 7 天，不续期）',
    PRIMARY KEY (\`sid\`),
    KEY \`idx_admin_sessions_admin\` (\`admin_uuid\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台管理员登录会话表'`,

  // 系统配置（键值对）：当前存认证方式开关 auth.methods
  `CREATE TABLE IF NOT EXISTS \`admin_settings\` (
    \`key\` VARCHAR(64) NOT NULL COMMENT '配置键',
    \`value\` JSON NOT NULL COMMENT '配置值',
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台系统配置表'`
]

// admins 表增量列（旧表升级：AuthApp 密钥与 Passkey 列表）
const ADMIN_COLUMNS_SQL: [string, string][] = [
  ['totp_secret', `
    ALTER TABLE \`admins\`
      ADD COLUMN \`totp_secret\` VARCHAR(255) NULL
      COMMENT 'AuthApp(TOTP)密钥密文（AES-256-GCM）；存在=已绑定' AFTER \`permissions\``],
  ['passkeys', `
    ALTER TABLE \`admins\`
      ADD COLUMN \`passkeys\` JSON NOT NULL DEFAULT (JSON_ARRAY())
      COMMENT 'Passkey 列表 [{id,publicKey,counter,...}]；非空=已绑定' AFTER \`totp_secret\``]
]

// dependencies 表增量列（旧表升级为「依赖/框架目录」：标识、类型、LOGO、排序）
const DEPENDENCIES_COLUMNS_SQL: [string, string][] = [
  ['slug', `
    ALTER TABLE \`dependencies\`
      ADD COLUMN \`slug\` VARCHAR(40) NOT NULL
      COMMENT '标识（全局唯一，用于检索与页面链接）' AFTER \`sid\``],
  ['kind', `
    ALTER TABLE \`dependencies\`
      ADD COLUMN \`kind\` ENUM('framework','library','tool','runtime') NOT NULL DEFAULT 'library'
      COMMENT '技术类型（框架/库/工具/运行时）' AFTER \`language_sid\``],
  ['logo_url', `
    ALTER TABLE \`dependencies\`
      ADD COLUMN \`logo_url\` VARCHAR(512) NULL
      COMMENT 'LOGO地址' AFTER \`intro\``],
  ['sort_order', `
    ALTER TABLE \`dependencies\`
      ADD COLUMN \`sort_order\` INT NOT NULL DEFAULT 0
      COMMENT '展示排序' AFTER \`link_url\``]
]

const DEPENDENCIES_INDEXES_SQL: [string, string][] = [
  ['uk_dependencies_slug', 'ALTER TABLE `dependencies` ADD UNIQUE KEY `uk_dependencies_slug` (`slug`)'],
  ['idx_dependencies_kind', 'ALTER TABLE `dependencies` ADD KEY `idx_dependencies_kind` (`kind`,`sort_order`)']
]

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'UTF8MB4_UNICODE_CI',
  timezone: '+08:00'
})

export function useDb() {
  return pool
}

// 编程语言基础数据检测：缺失的补记录、已有记录的空字段（图标/介绍/外部链接）回填
// 已填写过的内容不覆盖，保留后续维护成果；返回本次补写的记录数
export async function ensureLanguages(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT `slug`, `logo_url`, `intro`, `link_url` FROM `languages`')
  const existing = new Map(rows.map(row => [row.slug as string, row]))
  let changed = 0

  const missing = LANGUAGE_SEED
    .map((lang, index) => ({ ...lang, sort_order: index * 10 }))
    .filter(lang => !existing.has(lang.slug))
  if (missing.length) {
    const placeholders = missing.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = missing.flatMap(lang => [
      shortId(), lang.slug, lang.name, lang.logo_url, lang.intro, lang.link_url, lang.sort_order
    ])
    try {
      await pool.query(
        `INSERT INTO \`languages\` (\`sid\`,\`slug\`,\`name\`,\`logo_url\`,\`intro\`,\`link_url\`,\`sort_order\`)
         VALUES ${placeholders}`,
        values
      )
      changed += missing.length
    } catch (err) {
      // 多实例并发启动时另一实例已补齐
      if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err
    }
  }

  // 已存在的记录：只回填空字段（图标/介绍/外链），种子里本身为空的不算
  for (const lang of LANGUAGE_SEED) {
    const row = existing.get(lang.slug)
    const needsLogo = !!lang.logo_url && !row?.logo_url
    const needsIntro = !!row && !row.intro
    const needsLink = !!row && !row.link_url
    if (!row || (!needsLogo && !needsIntro && !needsLink)) continue
    await pool.query(
      'UPDATE `languages` SET `logo_url` = IFNULL(`logo_url`, ?), `intro` = IF(`intro` = \'\', ?, `intro`), `link_url` = IFNULL(`link_url`, ?) WHERE `slug` = ?',
      [lang.logo_url, lang.intro, lang.link_url, lang.slug]
    )
    changed++
  }

  return changed
}

// 依赖/框架目录检测：与 ensureLanguages 同规则（缺失补记录、关联缺失补关联、空字段回填、已填写不覆盖）
// 适用语言是多对多，关系落在 dependency_languages；语言不存在时跳过该语言（语言先于依赖补齐）
// 返回本次补写的记录数
export async function ensureDependencies(): Promise<number> {
  const [languageRows] = await pool.query<RowDataPacket[]>('SELECT `sid`, `slug` FROM `languages`')
  const languageSidBySlug = new Map(languageRows.map(row => [row.slug as string, row.sid as string]))

  const [rows] = await pool.query<RowDataPacket[]>('SELECT `slug`, `logo_url`, `intro`, `link_url` FROM `dependencies`')
  const existing = new Map(rows.map(row => [row.slug as string, row]))
  let changed = 0

  const missing = DEPENDENCY_SEED
    .map((dep, index) => ({ ...dep, sortOrder: index * 10 }))
    .filter(dep => !existing.has(dep.slug))
  if (missing.length) {
    const placeholders = missing.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = missing.flatMap(dep => [
      shortId(), dep.slug, dep.name, dep.kind, dep.intro, dep.logo_url, dep.link_url, dep.sortOrder
    ])
    try {
      await pool.query(
        `INSERT INTO \`dependencies\`
           (\`sid\`,\`slug\`,\`name\`,\`kind\`,\`intro\`,\`logo_url\`,\`link_url\`,\`sort_order\`)
         VALUES ${placeholders}`,
        values
      )
      changed += missing.length
    } catch (err) {
      // 多实例并发启动时另一实例已补齐
      if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err
    }
  }

  // 条目 ↔ 语言关联：补齐种子声明但库里还没有的关系（已存在的不动）
  const [dependencyRows] = await pool.query<RowDataPacket[]>('SELECT `sid`, `slug` FROM `dependencies`')
  const dependencySidBySlug = new Map(dependencyRows.map(row => [row.slug as string, row.sid as string]))
  const [linkRows] = await pool.query<RowDataPacket[]>('SELECT `dependency_sid`, `language_sid` FROM `dependency_languages`')
  const linked = new Set(linkRows.map(row => `${row.dependency_sid}:${row.language_sid}`))

  const newLinks: (string | number)[] = []
  let newLinkCount = 0
  for (const dep of DEPENDENCY_SEED) {
    const dependencySid = dependencySidBySlug.get(dep.slug)
    if (!dependencySid) continue
    dep.languages.forEach((language, index) => {
      const languageSid = languageSidBySlug.get(language)
      if (!languageSid || linked.has(`${dependencySid}:${languageSid}`)) return
      newLinks.push(shortId(), dependencySid, languageSid, index === 0 ? 1 : 0, index)
      newLinkCount++
    })
  }
  if (newLinkCount) {
    const placeholders = Array.from({ length: newLinkCount }, () => '(?, ?, ?, ?, ?)').join(', ')
    try {
      await pool.query(
        `INSERT INTO \`dependency_languages\`
           (\`sid\`,\`dependency_sid\`,\`language_sid\`,\`is_primary\`,\`sort_order\`)
         VALUES ${placeholders}`,
        newLinks
      )
      changed += newLinkCount
    } catch (err) {
      if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err
    }
  }

  // 已存在的记录：只回填空字段（图标/介绍/外链），种子里本身为空的不算
  for (const dep of DEPENDENCY_SEED) {
    const row = existing.get(dep.slug)
    const needsLogo = !!dep.logo_url && !row?.logo_url
    const needsIntro = !!row && !row.intro
    const needsLink = !!row && !row.link_url
    if (!row || (!needsLogo && !needsIntro && !needsLink)) continue
    await pool.query(
      'UPDATE `dependencies` SET `logo_url` = IFNULL(`logo_url`, ?), `intro` = IF(`intro` = \'\', ?, `intro`), `link_url` = IFNULL(`link_url`, ?) WHERE `slug` = ?',
      [dep.logo_url, dep.intro, dep.link_url, dep.slug]
    )
    changed++
  }

  return changed
}

// 首个管理员来自环境变量 ADMIN_EMAILS（逗号分隔）：仅在管理员表为空时写入，
// 避免控制台里删掉的管理员被下次重启复活；后续增删一律在控制台完成
export async function ensureAdmins(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS `count` FROM `admins`')
  if (Number(rows[0]?.count ?? 0) > 0) return 0

  const emails = [...new Set(
    (process.env.ADMIN_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  )]
  if (!emails.length) {
    console.warn('[console] 管理员表为空且未配置 ADMIN_EMAILS，后台无法登录')
    return 0
  }

  const placeholders = emails.map(() => '(?, ?, ?)').join(', ')
  await pool.query(
    `INSERT INTO \`admins\` (\`uuid\`,\`email\`,\`name\`) VALUES ${placeholders}`,
    emails.flatMap(email => [randomUUID(), email, ''])
  )
  return emails.length
}

// 幂等：首次启动检测到表不存在时自动创建；已存在则检查迁移；最后补齐语言与依赖（框架）基础数据
// 返回本次补齐的基础数据条数
export async function ensureSchema(): Promise<number> {
  await pool.query(USERS_TABLE_SQL)

  const [statusCol] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'`
  )
  if (!statusCol[0]?.count) {
    await pool.query(USERS_STATUS_MIGRATION_SQL)
  }

  // username 列：不存在则新增 → 回填为邮箱 → 置为 NOT NULL
  const [usernameCol] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`
  )
  if (!usernameCol[0]?.count) {
    await pool.query(USERS_USERNAME_ADD_SQL)
    await pool.query(USERS_USERNAME_BACKFILL_SQL)
    await pool.query(USERS_USERNAME_NOTNULL_SQL)
  }

  // username 唯一索引
  const [usernameIdx] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uk_users_username'`
  )
  if (!usernameIdx[0]?.count) {
    await pool.query(USERS_USERNAME_INDEX_SQL)
  }

  // github_login 列
  const [githubLoginCol] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'github_login'`
  )
  if (!githubLoginCol[0]?.count) {
    await pool.query(USERS_GITHUB_LOGIN_SQL)
  }

  // 用户名统一存小写（大小写不敏感，避免展示/存储不一致）
  await pool.query('UPDATE `users` SET `username` = LOWER(`username`) WHERE `username` <> LOWER(`username`)')

  // 逐个幂等补充的可选列（两步验证 + 个人介绍 + 后台处置字段）
  const extraCols: [string, string][] = [
    ['totp_secret', USERS_TOTP_SECRET_SQL],
    ['two_factor_enabled', USERS_TWO_FACTOR_ENABLED_SQL],
    ['recovery_codes', USERS_RECOVERY_CODES_SQL],
    ['bio', USERS_BIO_SQL],
    ['disabled_at', USERS_DISABLED_AT_SQL],
    ['disabled_by', USERS_DISABLED_BY_SQL],
    ['disabled_reason', USERS_DISABLED_REASON_SQL]
  ]
  for (const [col, sql] of extraCols) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [col]
    )
    if (!rows[0]?.count) await pool.query(sql)
  }

  // 用户状态索引（后台按状态筛选）
  const [statusIdx] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_status'`
  )
  if (!statusIdx[0]?.count) await pool.query(USERS_STATUS_INDEX_SQL)

  // 内容管理系统数据表（幂等建表）
  for (const sql of CONTENT_TABLES_SQL) await pool.query(sql)

  // dependencies 表增量列与索引（旧表升级）
  for (const [col, sql] of DEPENDENCIES_COLUMNS_SQL) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dependencies' AND COLUMN_NAME = ?`,
      [col]
    )
    if (!rows[0]?.count) await pool.query(sql)
  }
  for (const [index, sql] of DEPENDENCIES_INDEXES_SQL) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dependencies' AND INDEX_NAME = ?`,
      [index]
    )
    if (!rows[0]?.count) await pool.query(sql)
  }

  // 旧库升级：dependencies.language_sid（单语言）→ dependency_languages（多语言关联）
  // 先把旧列的值回填成关联，再删旧列，避免同一事实存两处
  const [languageCol] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dependencies' AND COLUMN_NAME = 'language_sid'`
  )
  if (languageCol[0]?.count) {
    const [legacyRows] = await pool.query<RowDataPacket[]>(
      'SELECT `sid`, `language_sid` FROM `dependencies` WHERE `language_sid` IS NOT NULL'
    )
    const [linkedRows] = await pool.query<RowDataPacket[]>(
      'SELECT `dependency_sid`, `language_sid` FROM `dependency_languages`'
    )
    const linked = new Set(linkedRows.map(row => `${row.dependency_sid}:${row.language_sid}`))
    const pending = legacyRows.filter(row => !linked.has(`${row.sid}:${row.language_sid}`))
    if (pending.length) {
      const placeholders = pending.map(() => '(?, ?, ?, ?, ?)').join(', ')
      await pool.query(
        `INSERT INTO \`dependency_languages\`
           (\`sid\`,\`dependency_sid\`,\`language_sid\`,\`is_primary\`,\`sort_order\`)
         VALUES ${placeholders}`,
        pending.flatMap(row => [shortId(), row.sid, row.language_sid, 1, 0])
      )
    }
    const [legacyIndex] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dependencies' AND INDEX_NAME = 'uk_dependencies_lang_name'`
    )
    if (legacyIndex[0]?.count) {
      await pool.query('ALTER TABLE `dependencies` DROP INDEX `uk_dependencies_lang_name`')
    }
    await pool.query('ALTER TABLE `dependencies` DROP COLUMN `language_sid`')
  }

  // 基础数据补齐：先语言（依赖需要解析语言 sid）
  const addedLanguages = await ensureLanguages()
  const addedDependencies = await ensureDependencies()

  // 后台系统：管理员表 + 会话表 + 配置表，随后按 ADMIN_EMAILS 引导首个管理员
  for (const sql of ADMIN_TABLES_SQL) await pool.query(sql)

  // admins 表增量列（旧表升级）
  for (const [col, sql] of ADMIN_COLUMNS_SQL) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admins' AND COLUMN_NAME = ?`,
      [col]
    )
    if (!rows[0]?.count) await pool.query(sql)
  }

  await pool.query('DELETE FROM `admin_sessions` WHERE `expires_at` < NOW()')
  const addedAdmins = await ensureAdmins()

  // 兜底告警：表里有管理员但没有正常状态的，控制台实际上没人能登录（需要手工改状态）
  const [available] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS `count` FROM `admins` WHERE `status` = 'normal'"
  )
  if (Number(available[0]?.count ?? 0) === 0) {
    console.warn('[console] 没有任何正常状态的管理员，后台无法登录（请检查 admins 表）')
  }

  return addedLanguages + addedDependencies + addedAdmins
}
