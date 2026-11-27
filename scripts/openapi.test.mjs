import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadOpenApi, validateOpenApi } from './build-openapi.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXPECTED_OPERATIONS = [
  'createGroup',
  'createSnippet',
  'deleteGroup',
  'deleteSnippet',
  'getApiInfo',
  'getCurrentIdentity',
  'getGroup',
  'getOpenApiDocument',
  'getSnippet',
  'listGroups',
  'listSnippets',
  'updateGroup',
  'updateSnippet'
]

const source = validateOpenApi(loadOpenApi(), EXPECTED_OPERATIONS)
const runtime = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/assets/openapi.v1.json'), 'utf8'))
const publicSpec = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/openapi.json'), 'utf8'))

assert.deepEqual(source, runtime, 'Published runtime JSON is stale; run npm run openapi:build')
assert.deepEqual(source, publicSpec, 'Published public JSON is stale; run npm run openapi:build')
assert.deepEqual(runtime.servers, [{ url: 'https://bits.micropue.com.cn/api/v1', description: 'Production' }])
assert.equal(runtime.info.version, '1.0.0')
assert.equal(runtime.components.securitySchemes.bearerAuth.scheme, 'bearer')
assert.equal(runtime.components.securitySchemes.apiKeyAuth.in, 'header')
assert.equal(runtime.components.securitySchemes.apiKeyAuth.name, 'X-API-Key')
assert.equal(runtime.paths['/me'].get['x-bits-permission'], 'content:read')
assert.equal(runtime.paths['/snippets'].post['x-bits-permission'], 'content:create')
assert.equal(runtime.paths['/snippets/{slug}'].patch['x-bits-permission'], 'content:update')
assert.equal(runtime.paths['/snippets/{slug}'].delete['x-bits-permission'], 'content:delete')
assert.equal(runtime.paths['/groups'].get.parameters[0].$ref, '#/components/parameters/Limit')
assert.equal(runtime.paths['/snippets'].post.responses['415'].$ref, '#/components/responses/UnsupportedMediaType')

const requiredRateHeaders = [
  'X-Request-Id',
  'X-API-Version',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'RateLimit-Limit',
  'RateLimit-Remaining',
  'RateLimit-Reset'
]
for (const [pathName, pathItem] of Object.entries(runtime.paths)) {
  for (const method of ['get', 'post', 'patch', 'delete']) {
    const operation = pathItem[method]
    if (!operation) continue
    const success = ['200', '201'].find(status => operation.responses[status])
    assert.ok(success, `${method.toUpperCase()} ${pathName} is missing a success response`)
    for (const header of requiredRateHeaders) {
      assert.ok(
        operation.responses[success].headers?.[header],
        `${method.toUpperCase()} ${pathName} ${success} is missing ${header}`
      )
    }
  }
}
for (const header of [...requiredRateHeaders, 'Retry-After']) {
  assert.ok(runtime.components.responses.TooManyRequests.headers?.[header], `TooManyRequests is missing ${header}`)
}
assert.equal(runtime.components.schemas.CreateSnippetRequest.additionalProperties, false)
assert.equal(runtime.components.schemas.UpdateSnippetRequest.additionalProperties, false)

console.log('[test:openapi] OpenAPI source, generated JSON and route contract are in sync')
