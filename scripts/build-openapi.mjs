import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import YAML from 'yaml'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'docs/openapi.v1.yaml')
const RUNTIME_OUTPUT = path.join(ROOT, 'server/assets/openapi.v1.json')
const PUBLIC_OUTPUT = path.join(ROOT, 'public/openapi.json')
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']

export function loadOpenApi() {
  return YAML.parse(fs.readFileSync(SOURCE, 'utf8'))
}

function localRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) localRefs(item, refs)
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string' && item.startsWith('#/')) refs.push(item)
      else localRefs(item, refs)
    }
  }
  return refs
}

function resolvePointer(document, ref) {
  return ref
    .slice(2)
    .split('/')
    .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((value, part) => value?.[part], document)
}

export function validateOpenApi(document, actualOperations = null) {
  assert.equal(document.openapi, '3.1.0', 'OpenAPI version must be 3.1.0')
  assert.match(document.info?.title ?? '', /\S/, 'info.title is required')
  assert.match(document.info?.version ?? '', /^\d+\.\d+\.\d+$/, 'info.version must be semantic')
  assert.ok(Array.isArray(document.servers) && document.servers.length, 'servers must not be empty')
  assert.ok(document.paths && typeof document.paths === 'object', 'paths must be an object')
  assert.ok(document.components?.securitySchemes?.bearerAuth, 'bearerAuth security scheme is required')
  assert.ok(document.components?.securitySchemes?.apiKeyAuth, 'apiKeyAuth security scheme is required')

  const operationIds = new Set()
  for (const [pathName, pathItem] of Object.entries(document.paths)) {
    assert.ok(pathName.startsWith('/'), `${pathName} must start with /`)
    for (const method of METHODS) {
      const operation = pathItem[method]
      if (!operation) continue

      assert.ok(operation.operationId, `${method.toUpperCase()} ${pathName} is missing operationId`)
      assert.ok(!operationIds.has(operation.operationId), `Duplicate operationId: ${operation.operationId}`)
      operationIds.add(operation.operationId)
      assert.ok(operation.summary, `${operation.operationId} is missing summary`)
      assert.ok(Array.isArray(operation.tags) && operation.tags.length, `${operation.operationId} is missing tags`)
      assert.ok(operation.responses && Object.keys(operation.responses).length, `${operation.operationId} is missing responses`)

      const declaredPathParams = new Set(
        [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
          .map(parameter => parameter.$ref ? resolvePointer(document, parameter.$ref) : parameter)
          .filter(parameter => parameter?.in === 'path')
          .map(parameter => parameter.name)
      )
      for (const name of pathName.matchAll(/\{([^}]+)\}/g)) {
        assert.ok(declaredPathParams.has(name[1]), `${operation.operationId} is missing path parameter ${name[1]}`)
      }
      if (['post', 'put', 'patch'].includes(method)) {
        assert.ok(operation.requestBody, `${operation.operationId} is missing requestBody`)
      }
      if (method === 'post') {
        assert.ok(operation.responses['201'] || operation.responses['200'], `${operation.operationId} is missing a success response`)
      }
    }
  }

  for (const ref of localRefs(document)) {
    assert.notEqual(resolvePointer(document, ref), undefined, `Unresolved $ref: ${ref}`)
  }

  if (actualOperations) {
    assert.deepEqual([...operationIds].sort(), [...actualOperations].sort(), 'OpenAPI operations do not match the public route set')
  }

  return document
}

export function buildOpenApi() {
  const document = validateOpenApi(loadOpenApi())
  const json = `${JSON.stringify(document, null, 2)}\n`
  fs.mkdirSync(path.dirname(RUNTIME_OUTPUT), { recursive: true })
  fs.writeFileSync(RUNTIME_OUTPUT, json)
  fs.writeFileSync(PUBLIC_OUTPUT, json)
  return document
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildOpenApi()
  console.log('[openapi] generated server/assets/openapi.v1.json and public/openapi.json')
}
