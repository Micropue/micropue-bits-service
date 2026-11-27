import openapi from '../../../server/assets/openapi.v1.json'

// docs/openapi.v1.yaml 是唯一规范源；构建前生成该文件与 /openapi.json。
export default defineApiV1Handler(event => {
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  return openapi
})
