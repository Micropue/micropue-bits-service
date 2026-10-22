import type { RowDataPacket } from 'mysql2/promise'

// 控制台概览：站点规模、待处理事项与最近内容
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const [[counts]] = await useDb().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM \`users\`) AS \`users\`,
       (SELECT COUNT(*) FROM \`languages\`) AS \`languages\`,
       (SELECT COUNT(*) FROM \`dependencies\`) AS \`dependencies\`,
       (SELECT COUNT(*) FROM \`contents\` WHERE \`kind\` = 'snippet' AND \`deleted_at\` IS NULL) AS \`snippets\`,
       (SELECT COUNT(*) FROM \`contents\` WHERE \`kind\` = 'group' AND \`deleted_at\` IS NULL) AS \`groups\`,
       (SELECT COALESCE(SUM(\`favorite_count\`), 0) FROM \`contents\` WHERE \`deleted_at\` IS NULL) AS \`favorites\`,
       (SELECT COUNT(*) FROM \`reports\`) AS \`reports\`,
       (SELECT COUNT(*) FROM \`feedback\`) AS \`feedback\`,
       (SELECT COUNT(*) FROM \`catalog_requests\` WHERE \`status\` = 'pending') AS \`pendingRequests\`,
       (SELECT COUNT(*) FROM \`catalog_requests\` WHERE \`status\` = 'pending' AND \`kind\` = 'language') AS \`pendingLanguages\`,
       (SELECT COUNT(*) FROM \`catalog_requests\` WHERE \`status\` = 'pending' AND \`kind\` = 'dependency') AS \`pendingDependencies\`,
       (SELECT COUNT(*) FROM \`changelogs\` WHERE \`published_at\` IS NULL) AS \`changelogDrafts\``
  )

  const [recentUsers] = await useDb().query<RowDataPacket[]>(
    `SELECT \`uuid\`, \`username\`, \`nickname\`, \`email\`, \`github_id\`, \`created_at\`
       FROM \`users\`
      ORDER BY \`created_at\` DESC
      LIMIT 5`
  )
  const [recentSnippets] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`created_at\`,
            u.\`username\`, u.\`nickname\`, l.\`name\` AS \`language_name\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL
      ORDER BY c.\`created_at\` DESC
      LIMIT 5`
  )
  const recentReports = await fetchDashboardReports({ limit: 5 })

  return {
    users: Number(counts.users),
    languages: Number(counts.languages),
    dependencies: Number(counts.dependencies),
    snippets: Number(counts.snippets),
    groups: Number(counts.groups),
    favorites: Number(counts.favorites),
    reports: Number(counts.reports),
    feedback: Number(counts.feedback),
    pendingRequests: Number(counts.pendingRequests),
    pendingLanguages: Number(counts.pendingLanguages),
    pendingDependencies: Number(counts.pendingDependencies),
    changelogDrafts: Number(counts.changelogDrafts),
    recentUsers: recentUsers.map(row => ({
      uuid: row.uuid as string,
      username: row.username as string,
      nickname: row.nickname as string,
      email: row.email as string,
      avatarUrl: githubAvatar(row.github_id),
      createdAt: row.created_at as string
    })),
    recentSnippets: recentSnippets.map(row => ({
      sid: row.sid as string,
      slug: row.slug as string,
      name: row.name as string,
      username: row.username as string,
      nickname: row.nickname as string,
      languageName: row.language_name as string | null,
      createdAt: row.created_at as string
    })),
    recentReports: recentReports.reports
  }
})
