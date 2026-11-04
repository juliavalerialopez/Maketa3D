// Daily generation limits (Part F, H.1): successful generations per UTC day
// in total and per visitor, counted in Upstash Redis over its REST API.
// The numbers come from RESTYLE_TOTAL_LIMIT and RESTYLE_VISITOR_LIMIT
// (defaults 20 and 3, the public limits; raise them only for local testing).
// A visitor is an HMAC of their IP keyed with a daily salt (an HMAC of
// VISITOR_SECRET and the date): the raw IP is never stored or logged, and
// hashes cannot be linked across days.
import { createHmac } from 'node:crypto'

const DEFAULT_TOTAL_LIMIT = 20
const DEFAULT_VISITOR_LIMIT = 3
const EXPIRY_SECONDS = String(2 * 24 * 60 * 60)

// A whole number of at least 1 from the environment, else the default.
function limitFromEnv(name, fallback) {
  const raw = process.env[name]
  const value = Number(raw)
  return raw && /^\d+$/.test(raw.trim()) && value >= 1 ? value : fallback
}

// The current limits: { visitorLimit, totalLimit }.
export function limits() {
  return {
    visitorLimit: limitFromEnv('RESTYLE_VISITOR_LIMIT', DEFAULT_VISITOR_LIMIT),
    totalLimit: limitFromEnv('RESTYLE_TOTAL_LIMIT', DEFAULT_TOTAL_LIMIT),
  }
}

async function redis(path, commands) {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Upstash is not configured')
  const response = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!response.ok) throw new Error(`Upstash request failed (${response.status})`)
  return response.json()
}

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

// Redis keys for today: the total and this visitor's count.
function todayKeys(request) {
  const secret = process.env.VISITOR_SECRET
  if (!secret) throw new Error('VISITOR_SECRET is not set')
  const day = new Date().toISOString().slice(0, 10)
  const salt = createHmac('sha256', secret).update(day).digest()
  const visitor = createHmac('sha256', salt).update(clientIp(request)).digest('hex')
  return { total: `restyle:${day}`, visitor: `restyle:${day}:v:${visitor}` }
}

// What this visitor can still make today (the smaller of both limits), and
// when that is 0, which limit was reached.
export function status(total, visitor) {
  const { visitorLimit, totalLimit } = limits()
  const totalLeft = totalLimit - total
  const visitorLeft = visitorLimit - visitor
  const remaining = Math.max(0, Math.min(totalLeft, visitorLeft))
  if (remaining > 0) return { remaining }
  return { remaining, limit: totalLeft <= 0 ? 'total' : 'visitor' }
}

// { remaining, limit? } for this visitor, without counting.
export async function remaining(request) {
  const keys = todayKeys(request)
  const { result } = await redis('', ['MGET', keys.total, keys.visitor])
  return status(Number(result[0] ?? 0), Number(result[1] ?? 0))
}

// Counts one generation before the AI call. Over a limit, the count is undone:
// { ok: false, limit: 'total' | 'visitor', remaining: 0 }. Otherwise
// { ok: true, keys, remaining, limit? }; call release(keys) if the
// generation fails.
export async function reserve(request) {
  const keys = todayKeys(request)
  const results = await redis('/multi-exec', [
    ['INCR', keys.total],
    ['EXPIRE', keys.total, EXPIRY_SECONDS],
    ['INCR', keys.visitor],
    ['EXPIRE', keys.visitor, EXPIRY_SECONDS],
  ])
  const total = Number(results[0].result)
  const visitor = Number(results[2].result)
  const { visitorLimit, totalLimit } = limits()
  if (total > totalLimit || visitor > visitorLimit) {
    await release(keys)
    return { ok: false, limit: total > totalLimit ? 'total' : 'visitor', remaining: 0 }
  }
  return { ok: true, keys, ...status(total, visitor) }
}

// Undoes one reserved generation (over a limit, or the AI call failed).
export async function release(keys) {
  await redis('/multi-exec', [
    ['DECR', keys.total],
    ['DECR', keys.visitor],
  ])
}
