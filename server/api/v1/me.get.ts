// 当前 API Key 对应的用户与权限
export default defineApiV1Handler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const auth = await requireApiV1(event, 'content:read')
  return {
    data: {
      user: {
        uuid: auth.user.uuid,
        username: auth.user.username,
        nickname: auth.user.nickname
      },
      apiKey: apiKeySummary(auth)
    }
  }
})
