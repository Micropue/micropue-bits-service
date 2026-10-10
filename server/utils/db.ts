import mysql, { type RowDataPacket } from 'mysql2/promise'

// 用户账户表：所有用户数据统一存这一张表，以账户 UUID 作为唯一标识
// 规范详见 项目综合设计.md「二、数据结构与开发规范」
const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`users\` (
  \`uuid\` CHAR(36) NOT NULL COMMENT '账户UUID（标准UUID格式，唯一标识，不可更改）',
  \`email\` VARCHAR(254) NOT NULL COMMENT '电子邮件（唯一，大小写不敏感）',
  \`username\` VARCHAR(254) NOT NULL COMMENT '用户名（唯一，大小写不敏感；注册默认=电子邮件，一旦设置不可修改）',
  \`email_verified_at\` DATETIME NULL COMMENT '电子邮件真实性验证通过时间',
  \`nickname\` VARCHAR(20) NOT NULL COMMENT '昵称（2-20位，仅数字/字母/下划线/短横线）',
  \`github_id\` BIGINT UNSIGNED NULL COMMENT 'Github账户ID（一对一绑定）',
  \`password_hash\` VARCHAR(255) NULL COMMENT '密码哈希（Argon2id/bcrypt/scrypt，禁止明文或普通SHA256）',
  \`passkeys\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'Passkey通行密钥列表 [{credentialId,publicKey,...}]',
  \`last_login_at\` DATETIME NULL COMMENT '最近登录时间（每次新登录会话产生时覆盖）',
  \`login_devices\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '登录设备列表 [{type,token,loginAt}]',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  \`status\` ENUM('normal','disabled') NOT NULL DEFAULT 'normal' COMMENT '账户状态（正常/禁用，客户端不可修改）',
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

// 幂等：首次启动检测到表不存在时自动创建；已存在则检查迁移
export async function ensureSchema() {
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
}
