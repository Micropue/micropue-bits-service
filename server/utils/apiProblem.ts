import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'

const PROBLEM_BASE = 'https://bits.micropue.com.cn/docs/developer/open-api#errors'

const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable'
}

const STATUS_CODES: Record<number, string> = {
  400: 'invalid_request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'validation_failed',
  429: 'rate_limited',
  500: 'internal_error',
  503: 'service_unavailable'
}

interface ApiProblemIssue {
  path: string
  message: string
}

function apiRequestId(event: H3Event): string {
  if (!event.context.apiRequestId) {
    event.context.apiRequestId = `req_${randomUUID().replace(/-/g, '')}`
  }
  return String(event.context.apiRequestId)
}

function normalizeCode(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function problemIssues(data: Record<string, unknown>, detail: string): ApiProblemIssue[] {
  const rawErrors = Array.isArray(data.errors) ? data.errors : []
  const issues = rawErrors.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const value = item as { path?: unknown, message?: unknown }
    if (typeof value.message !== 'string' || !value.message) return []
    return [{
      path: typeof value.path === 'string' && value.path ? value.path : 'request',
      message: value.message
    }]
  }).slice(0, 50)
  if (issues.length) return issues

  const field = typeof data.field === 'string' ? data.field : ''
  return field ? [{ path: field, message: detail }] : []
}

export function sendApiProblem(event: H3Event, error: unknown, requestId = apiRequestId(event)) {
  const source = error as {
    statusCode?: unknown
    status?: unknown
    statusMessage?: unknown
    message?: unknown
    data?: unknown
  }
  const rawStatus = Number(source?.statusCode ?? source?.status)
  const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus
    : 500
  const data = source?.data && typeof source.data === 'object'
    ? source.data as Record<string, unknown>
    : {}
  const detail = status >= 500 && status !== 503
    ? 'An unexpected error occurred. Try again later.'
    : String(source?.statusMessage || source?.message || 'Request failed.')
  const code = normalizeCode(data.code) || STATUS_CODES[status] || 'request_failed'
  const title = STATUS_TITLES[status] ?? (status >= 500 ? 'Server Error' : 'Request Failed')
  const errors = problemIssues(data, detail)

  if (status >= 500 && status !== 503) {
    console.error('[api/v1] unhandled error', error)
  }

  setResponseStatus(event, status)
  setResponseHeader(event, 'content-type', 'application/problem+json; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'no-store')
  setResponseHeader(event, 'x-request-id', requestId)
  setResponseHeader(event, 'x-api-version', 'v1')
  if (data.retryAfterSeconds) {
    setResponseHeader(event, 'retry-after', String(data.retryAfterSeconds))
  }

  return {
    type: `${PROBLEM_BASE}/${code.replace(/_/g, '-')}`,
    title,
    status,
    code,
    detail,
    requestId,
    ...(errors.length ? { errors } : {}),
    ...(data.requiredPermission ? { requiredPermission: data.requiredPermission } : {}),
    ...(data.retryAfterSeconds ? { retryAfter: data.retryAfterSeconds } : {})
  }
}

// API v1 的错误统一为 RFC 9457 application/problem+json，并为每个请求返回可追踪的 ID。
export function defineApiV1Handler(handler: (event: H3Event) => Promise<unknown> | unknown) {
  return defineEventHandler(async event => {
    const requestId = apiRequestId(event)
    setResponseHeader(event, 'x-request-id', requestId)
    setResponseHeader(event, 'x-api-version', 'v1')
    try {
      return await handler(event)
    } catch (error) {
      return sendApiProblem(event, error, requestId)
    }
  })
}
