import mysql from 'mysql2/promise'

// 用户账户表：所有用户数据统一存这一张表，以账户 UUID 作为唯一标识
// 规范详见 项目综合设计.md「二、数据结构与开发规范」
const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`users\` (
  \`uuid\` CHAR(36) NOT NULL COMMENT '账户UUID（标准UUID格式，唯一标识，不可更改）',
  \`email\` VARCHAR(254) NOT NULL COMMENT '电子邮件（唯一，大小写不敏感）',
  \`email_verified_at\` DATETIME NULL COMMENT '电子邮件真实性验证通过时间',
  \`nickname\` VARCHAR(20) NOT NULL COMMENT '昵称（2-20位，仅数字/字母/下划线/短横线）',
  \`github_id\` BIGINT UNSIGNED NULL COMMENT 'Github账户ID（一对一绑定）',
  \`password_hash\` VARCHAR(255) NULL COMMENT '密码哈希（Argon2id/bcrypt/scrypt，禁止明文或普通SHA256）',
  \`passkeys\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'Passkey通行密钥列表 [{credentialId,publicKey,...}]',
  \`last_login_at\` DATETIME NULL COMMENT '最近登录时间（每次新登录会话产生时覆盖）',
  \`login_devices\` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '登录设备列表 [{type,token,loginAt}]',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  PRIMARY KEY (\`uuid\`),
  UNIQUE KEY \`uk_users_email\` (\`email\`),
  UNIQUE KEY \`uk_users_github_id\` (\`github_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账户表';
`

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

// 幂等：首次启动检测到表不存在时自动创建，已存在则无操作
export async function ensureSchema() {
  await pool.query(USERS_TABLE_SQL)
}
