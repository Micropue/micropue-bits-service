import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { useDb } from './db'
import { shortId } from './id'
import { attachTags, githubAvatar } from './publicContent'
import { groupKeywordCondition, keywordTerms, snippetKeywordCondition } from './contentSearch'

// 收藏 / 反馈 / 举报的共用读写

export async function setFavorite(userUuid: string, contentSid: string, favorited: boolean) {
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    if (favorited) {
      const [result] = await conn.execute<ResultSetHeader>(
        'INSERT IGNORE INTO `favorites` (`sid`, `user_uuid`, `content_sid`) VALUES (?, ?, ?)',
        [shortId(), userUuid, contentSid]
      )
      if (result.affectedRows) {
        await conn.execute(
          'UPDATE `contents` SET `favorite_count` = `favorite_count` + 1 WHERE `sid` = ?',
          [contentSid]
        )
      }
    } else {
      const [result] = await conn.execute<ResultSetHeader>(
        'DELETE FROM `favorites` WHERE `user_uuid` = ? AND `content_sid` = ?',
        [userUuid, contentSid]
      )
      if (result.affectedRows) {
        await conn.execute(
          'UPDATE `contents` SET `favorite_count` = GREATEST(`favorite_count`, 1) - 1 WHERE `sid` = ?',
          [contentSid]
        )
      }
    }
    const [[row]] = await conn.query<RowDataPacket[]>(
      'SELECT `favorite_count` FROM `contents` WHERE `sid` = ? LIMIT 1',
      [contentSid]
    )
    await conn.commit()
    return Number(row?.favorite_count ?? 0)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function fetchFavorites(
  userUuid: string,
  kind: 'snippet' | 'group',
  options: { q?: string, limit?: number, offset?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50)
  const offset = Math.max(options.offset ?? 0, 0)
  const terms = keywordTerms(options.q, 5)
  const params: (string | number)[] = [userUuid, kind]
  const filters = terms.map(term => kind === 'snippet'
    ? snippetKeywordCondition(term, params)
    : groupKeywordCondition(term, params, 'c'))
  const where = [
    'f.`user_uuid` = ?',
    'c.`kind` = ?',
    'c.`deleted_at` IS NULL',
    "c.`visibility` IN ('public', 'unlisted')",
    'u.`username` IS NOT NULL',
    'u.`username` <> u.`email`',
    ...filters
  ].join(' AND ')

  const from = `
    FROM \`favorites\` f
    JOIN \`contents\` c ON c.\`sid\` = f.\`content_sid\`
    JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
    ${kind === 'snippet' ? 'LEFT JOIN `languages` l ON l.`sid` = c.`language_sid`' : ''}
  `

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` ${from} WHERE ${where}`,
    params
  )

  const languageSelect = kind === 'snippet'
    ? 'l.`slug` AS `language_slug`, l.`name` AS `language_name`, l.`logo_url` AS `language_logo`'
    : 'NULL AS `language_slug`, NULL AS `language_name`, NULL AS `language_logo`'
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`updated_at\`, c.\`favorite_count\`,
            f.\`created_at\` AS \`favorited_at\`,
            u.\`username\`, u.\`nickname\`, u.\`github_id\`,
            ${languageSelect},
            (SELECT COUNT(*) FROM \`contents\` s
              WHERE s.\`group_sid\` = c.\`sid\` AND s.\`kind\` = 'snippet'
                AND s.\`deleted_at\` IS NULL AND s.\`visibility\` = 'public') AS \`snippet_count\`
       ${from}
      WHERE ${where}
      ORDER BY f.\`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const items = await attachTags(rows.map(row => ({
    sid: row.sid as string,
    kind,
    slug: row.slug as string,
    name: row.name as string,
    intro: row.intro as string,
    visibility: row.visibility as string,
    updated_at: row.updated_at as string,
    favoritedAt: row.favorited_at as string,
    favoriteCount: Number(row.favorite_count ?? 0),
    snippetCount: kind === 'group' ? Number(row.snippet_count ?? 0) : undefined,
    language: row.language_slug
      ? { slug: row.language_slug as string, name: row.language_name as string, logo_url: row.language_logo as string | null }
      : null,
    author: {
      username: row.username as string,
      nickname: row.nickname as string,
      avatarUrl: githubAvatar(row.github_id)
    }
  })))
  return { items, total: Number(countRow?.total ?? 0) }
}

// 作者收到的反馈：只统计自己的代码段，最多取最近 100 条
export async function fetchAccountFeedback(
  userUuid: string,
  options: { q?: string, limit?: number, offset?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)
  const offset = Math.max(options.offset ?? 0, 0)
  const q = String(options.q ?? '').trim().slice(0, 120)
  const params: (string | number)[] = [userUuid]
  const search = q
    ? (() => {
        const pattern = `%${q.replace(/[\\%_]/g, char => `\\${char}`)}%`
        params.push(pattern, pattern, pattern, pattern)
        return '(c.`name` LIKE ? OR f.`detail` LIKE ? OR u.`nickname` LIKE ? OR u.`username` LIKE ?)'
      })()
    : '1 = 1'
  const from = `
    FROM \`feedback\` f
    JOIN \`contents\` c ON c.\`sid\` = f.\`content_sid\`
    JOIN \`users\` u ON u.\`uuid\` = f.\`user_uuid\`
    JOIN \`users\` o ON o.\`uuid\` = c.\`owner_uuid\`
  `
  const condition = [
    'c.`owner_uuid` = ?',
    "c.`kind` = 'snippet'",
    'c.`deleted_at` IS NULL',
    search
  ].join(' AND ')

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM (
       SELECT f.\`sid\` ${from} WHERE ${condition} ORDER BY f.\`created_at\` DESC LIMIT 100
     ) recent`,
    params
  )
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT f.\`sid\`, f.\`type\`, f.\`detail\`, f.\`status\`, f.\`created_at\`,
            c.\`slug\` AS \`snippet_slug\`, c.\`name\` AS \`snippet_name\`, o.\`username\` AS \`owner_username\`,
            CASE WHEN u.\`username\` <> u.\`email\` THEN u.\`username\` END AS \`username\`,
            u.\`nickname\`, u.\`github_id\`
       ${from}
      WHERE ${condition}
      ORDER BY f.\`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return {
    items: rows.map(row => ({
      sid: row.sid as string,
      type: row.type as string,
      detail: row.detail as string,
      status: row.status as string,
      createdAt: row.created_at as string,
      snippet: {
        slug: row.snippet_slug as string,
        name: row.snippet_name as string,
        username: row.owner_username as string
      },
      from: {
        username: row.username as string | null,
        nickname: row.nickname as string,
        avatarUrl: githubAvatar(row.github_id)
      }
    })),
    total: Number(countRow?.total ?? 0)
  }
}

// 当前账户提交过的举报：最近 100 条
export async function fetchAccountReports(
  userUuid: string,
  options: { q?: string, limit?: number, offset?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)
  const offset = Math.max(options.offset ?? 0, 0)
  const q = String(options.q ?? '').trim().slice(0, 120)
  const params: (string | number)[] = [userUuid]
  const search = q
    ? (() => {
        const pattern = `%${q.replace(/[\\%_]/g, char => `\\${char}`)}%`
        params.push(pattern, pattern, pattern, pattern, pattern)
        return '(c.`name` LIKE ? OR tu.`nickname` LIKE ? OR tu.`username` LIKE ? OR r.`detail` LIKE ? OR r.`type` LIKE ?)'
      })()
    : '1 = 1'

  const from = `
    FROM \`reports\` r
    LEFT JOIN \`contents\` c ON r.\`target_kind\` = 'content' AND c.\`sid\` = r.\`target_ref\`
    LEFT JOIN \`users\` cu ON cu.\`uuid\` = c.\`owner_uuid\`
    LEFT JOIN \`users\` tu ON r.\`target_kind\` = 'user' AND tu.\`uuid\` = r.\`target_ref\`
  `
  const condition = ['r.`reporter_uuid` = ?', search].join(' AND ')

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM (
       SELECT r.\`sid\` ${from} WHERE ${condition} ORDER BY r.\`created_at\` DESC LIMIT 100
     ) recent`,
    params
  )
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT r.\`sid\`, r.\`type\`, r.\`detail\`, r.\`status\`, r.\`created_at\`,
            CASE WHEN r.\`target_kind\` = 'user' THEN 'user' ELSE c.\`kind\` END AS \`target_kind\`,
            c.\`slug\`, c.\`name\` AS \`content_name\`, c.\`deleted_at\`,
            cu.\`username\` AS \`content_username\`, cu.\`nickname\` AS \`content_nickname\`,
            tu.\`username\` AS \`user_username\`, tu.\`nickname\` AS \`user_nickname\`
       ${from}
      WHERE ${condition}
      ORDER BY r.\`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return {
    items: rows.map(row => {
      const targetKind = row.target_kind as string
      const isUser = targetKind === 'user'
      return {
        sid: row.sid as string,
        type: row.type as string,
        detail: row.detail as string,
        status: row.status as string,
        createdAt: row.created_at as string,
        target: {
          kind: targetKind,
          name: isUser ? row.user_nickname as string : row.content_name as string,
          username: isUser ? row.user_username as string : row.content_username as string,
          slug: isUser ? null : row.slug as string,
          deleted: !isUser && !!row.deleted_at
        }
      }
    }),
    total: Number(countRow?.total ?? 0)
  }
}

// 控制台举报列表：管理员只读查看
export async function fetchDashboardReports(options: { q?: string, limit?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 500)
  const q = String(options.q ?? '').trim().slice(0, 120)
  const params: (string | number)[] = []
  const search = q
    ? (() => {
        const pattern = `%${q.replace(/[\\%_]/g, char => `\\${char}`)}%`
        params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern)
        return `(c.\`name\` LIKE ? OR tu.\`nickname\` LIKE ? OR tu.\`username\` LIKE ?
          OR ru.\`nickname\` LIKE ? OR ru.\`username\` LIKE ? OR r.\`detail\` LIKE ? OR r.\`type\` LIKE ?)`
      })()
    : '1 = 1'

  const from = `
    FROM \`reports\` r
    LEFT JOIN \`contents\` c ON r.\`target_kind\` = 'content' AND c.\`sid\` = r.\`target_ref\`
    LEFT JOIN \`users\` cu ON cu.\`uuid\` = c.\`owner_uuid\`
    LEFT JOIN \`users\` tu ON r.\`target_kind\` = 'user' AND tu.\`uuid\` = r.\`target_ref\`
    JOIN \`users\` ru ON ru.\`uuid\` = r.\`reporter_uuid\`
  `
  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` ${from} WHERE ${search}`,
    params
  )
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT r.\`sid\`, r.\`type\`, r.\`detail\`, r.\`status\`, r.\`result\`, r.\`handled_at\`, r.\`created_at\`,
            CASE WHEN r.\`target_kind\` = 'user' THEN 'user' ELSE c.\`kind\` END AS \`target_kind\`,
            c.\`slug\`, c.\`name\` AS \`content_name\`, c.\`visibility\`, c.\`deleted_at\`,
            cu.\`username\` AS \`content_username\`, cu.\`nickname\` AS \`content_nickname\`,
            tu.\`username\` AS \`user_username\`, tu.\`nickname\` AS \`user_nickname\`,
            ru.\`username\` AS \`reporter_username\`, ru.\`nickname\` AS \`reporter_nickname\`,
            ru.\`email\` AS \`reporter_email\`, ru.\`github_id\` AS \`reporter_github_id\`
       ${from}
      WHERE ${search}
      ORDER BY r.\`created_at\` DESC
      LIMIT ?`,
    [...params, limit]
  )

  return {
    reports: rows.map(row => {
      const targetKind = row.target_kind as string
      const isUser = targetKind === 'user'
      return {
        sid: row.sid as string,
        type: row.type as string,
        detail: row.detail as string,
        status: row.status as string,
        result: row.result as string,
        handledAt: row.handled_at as string | null,
        createdAt: row.created_at as string,
        target: {
          kind: targetKind,
          name: isUser ? row.user_nickname as string : row.content_name as string,
          username: isUser ? row.user_username as string : row.content_username as string,
          slug: isUser ? null : row.slug as string,
          visibility: isUser ? null : row.visibility as string,
          deleted: !isUser && !!row.deleted_at
        },
        reporter: {
          nickname: row.reporter_nickname as string,
          username: row.reporter_username === row.reporter_email ? null : row.reporter_username as string,
          email: row.reporter_email as string,
          avatarUrl: githubAvatar(row.reporter_github_id)
        }
      }
    }),
    total: Number(countRow?.total ?? 0),
    truncated: Number(countRow?.total ?? 0) > rows.length
  }
}
