import type { RowDataPacket } from 'mysql2/promise'

// 公开内容详情（代码段 / 分组共用 /{username}/{slug}）
// public 所有人可见；unlisted 凭链接可见；private 仅作者本人；无权限统一 404
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()

  const [viewer, user] = await Promise.all([getAuthUser(event), findPublicUser(username)])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const content = await fetchContentKind(user.uuid, slug)
  if (!content) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const isOwner = viewer?.uuid === user.uuid
  const author = { username: user.username, nickname: user.nickname, avatarUrl: githubAvatar(user.github_id) }

  if (content.kind === 'group') {
    const group = await fetchGroupBySlug(user.uuid, slug)
    if (!group) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    if (group.visibility === 'private' && !isOwner) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    const [tags, snippets] = await Promise.all([
      fetchSnippetTags(group.sid),
      fetchGroupSnippets(group.sid, isOwner)
    ])
    const [favoriteRows] = viewer
      ? await useDb().query<RowDataPacket[]>('SELECT 1 FROM `favorites` WHERE `user_uuid` = ? AND `content_sid` = ? LIMIT 1', [viewer.uuid, group.sid])
      : [[]]

    // 分组 Fork 来源（仅当来源仍公开时展示）
    let groupForkFrom: { slug: string, name: string, author: { username: string, nickname: string } } | null = null
    if (group.fork_from_sid) {
      const [forkRows] = await useDb().query<RowDataPacket[]>(
        `SELECT g.\`slug\`, g.\`name\`, u.\`username\`, u.\`nickname\`
           FROM \`contents\` g
           JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
          WHERE g.\`sid\` = ? AND g.\`deleted_at\` IS NULL AND g.\`visibility\` = 'public'
          LIMIT 1`,
        [group.fork_from_sid]
      )
      const row = forkRows[0]
      if (row) {
        groupForkFrom = {
          slug: row.slug as string,
          name: row.name as string,
          author: { username: row.username as string, nickname: row.nickname as string }
        }
      }
    }

    return {
      kind: 'group',
      group: {
        slug: group.slug,
        name: group.name,
        intro: group.intro,
        visibility: group.visibility,
        forkCount: Number(group.fork_count ?? 0),
        favoriteCount: Number(group.favorite_count ?? 0),
        isFavorited: favoriteRows.length > 0,
        forkFrom: groupForkFrom,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        tags,
        author,
        isOwner
      },
      snippets
    }
  }

  const snippet = await fetchSnippetBySlug(user.uuid, slug)
  if (!snippet) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (snippet.visibility === 'private' && !isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const [tags, dependencies] = await Promise.all([
    fetchSnippetTags(snippet.sid),
    fetchSnippetDependencies(snippet.sid)
  ])
  const [favoriteRows] = viewer
    ? await useDb().query<RowDataPacket[]>('SELECT 1 FROM `favorites` WHERE `user_uuid` = ? AND `content_sid` = ? LIMIT 1', [viewer.uuid, snippet.sid])
    : [[]]

  // Fork 来源（仅当来源仍公开时展示，避免指向已隐藏内容）
  let forkFrom: { slug: string, name: string, author: { username: string, nickname: string } } | null = null
  if (snippet.fork_from_sid) {
    const [forkRows] = await useDb().query<RowDataPacket[]>(
      `SELECT c.\`slug\`, c.\`name\`, u.\`username\`, u.\`nickname\`
         FROM \`contents\` c
         JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
        WHERE c.\`sid\` = ? AND c.\`deleted_at\` IS NULL AND c.\`visibility\` = 'public'
        LIMIT 1`,
      [snippet.fork_from_sid]
    )
    const row = forkRows[0]
    if (row) {
      forkFrom = {
        slug: row.slug as string,
        name: row.name as string,
        author: { username: row.username as string, nickname: row.nickname as string }
      }
    }
  }

  return {
    kind: 'snippet',
    snippet: {
      slug: snippet.slug,
      name: snippet.name,
      intro: snippet.intro,
      code: snippet.code,
      visibility: snippet.visibility,
      copyCount: Number(snippet.copy_count ?? 0),
      forkCount: Number(snippet.fork_count ?? 0),
      favoriteCount: Number(snippet.favorite_count ?? 0),
      isFavorited: favoriteRows.length > 0,
      forkFrom,
      createdAt: snippet.created_at,
      updatedAt: snippet.updated_at,
      language: snippet.language_slug
        ? { slug: snippet.language_slug, name: snippet.language_name, logo_url: snippet.language_logo }
        : null,
      tags,
      dependencies,
      author,
      isOwner
    }
  }
})
