export default defineApiV1Handler(event => {
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return {
    name: 'BITS Open API',
    version: 'v1',
    apiVersion: '1.0.0',
    docs: 'https://bits.micropue.com.cn/docs/developer/open-api',
    openapi: 'https://bits.micropue.com.cn/api/v1/openapi.json'
  }
})
