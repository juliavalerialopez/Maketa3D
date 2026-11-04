import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { limits, RESERVE_SCRIPT, reserve, status } from '../api/_limits.js'
import { countOf, limitMessage } from '../src/services/restyle.js'

// The public defaults (3 per visitor, 20 in total) unless a test sets them.
const clearEnv = () => {
  delete process.env.RESTYLE_VISITOR_LIMIT
  delete process.env.RESTYLE_TOTAL_LIMIT
}
beforeEach(clearEnv)
afterEach(clearEnv)

test('the default limits are 3 per visitor and 20 in total', () => {
  assert.deepEqual(limits(), { visitorLimit: 3, totalLimit: 20 })
})

test('limits from the environment must be whole numbers of at least 1', () => {
  process.env.RESTYLE_VISITOR_LIMIT = '20'
  process.env.RESTYLE_TOTAL_LIMIT = 'abc'
  assert.deepEqual(limits(), { visitorLimit: 20, totalLimit: 20 })
  process.env.RESTYLE_VISITOR_LIMIT = '0'
  assert.equal(limits().visitorLimit, 3)
})

test('remaining is the smaller of both limits, and says which one was reached', () => {
  assert.deepEqual(status(0, 0), { remaining: 3 })
  assert.deepEqual(status(18, 0), { remaining: 2 })
  assert.deepEqual(status(5, 3), { remaining: 0, limit: 'visitor' })
  assert.deepEqual(status(20, 1), { remaining: 0, limit: 'total' })
})

// reserve() with a stand-in for Upstash: records the command and answers
// with `result`, so no network is used.
async function reserveWith(result) {
  const realFetch = globalThis.fetch
  const sent = []
  process.env.KV_REST_API_URL = 'https://upstash.test'
  process.env.KV_REST_API_TOKEN = 'token'
  process.env.VISITOR_SECRET = 'secret'
  globalThis.fetch = async (url, init) => {
    sent.push({ url, command: JSON.parse(init.body) })
    return Response.json({ result })
  }
  try {
    const request = new Request('http://localhost/api/restyle', { headers: { 'x-forwarded-for': '1.2.3.4' } })
    return { reservation: await reserve(request), sent }
  } finally {
    globalThis.fetch = realFetch
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    delete process.env.VISITOR_SECRET
  }
}

test('reserve checks and counts in one script call with both limits', async () => {
  const { reservation, sent } = await reserveWith([1, 5, 2])
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, 'https://upstash.test')
  const [name, script, keyCount, totalKey, visitorKey, totalLimit, visitorLimit, expiry] = sent[0].command
  assert.equal(name, 'EVAL')
  assert.equal(script, RESERVE_SCRIPT)
  assert.equal(keyCount, '2')
  assert.match(totalKey, /^restyle:\d{4}-\d{2}-\d{2}$/)
  assert.match(visitorKey, /^restyle:\d{4}-\d{2}-\d{2}:v:[0-9a-f]{64}$/)
  assert.ok(!visitorKey.includes('1.2.3.4'))
  assert.deepEqual([totalLimit, visitorLimit, expiry], ['20', '3', String(2 * 24 * 60 * 60)])
  assert.equal(reservation.ok, true)
  assert.equal(reservation.remaining, 1)
})

test('the last allowed generation is counted and says the limit is now reached', async () => {
  const { reservation } = await reserveWith([1, 5, 3])
  assert.equal(reservation.ok, true)
  assert.equal(reservation.remaining, 0)
  assert.equal(reservation.limit, 'visitor')
})

test('reserve at a limit counts nothing and says which limit', async () => {
  const total = await reserveWith([0, 20, 1, 'total'])
  assert.deepEqual(total.reservation, { ok: false, limit: 'total', remaining: 0 })
  assert.equal(total.sent.length, 1)
  const visitor = await reserveWith([0, 4, 3, 'visitor'])
  assert.deepEqual(visitor.reservation, { ok: false, limit: 'visitor', remaining: 0 })
  assert.equal(visitor.sent.length, 1)
})

test('the page reads the count from a server answer', () => {
  assert.deepEqual(countOf({ remaining: 2, visitorLimit: 3, totalLimit: 20 }), {
    remaining: 2,
    limit: null,
    visitorLimit: 3,
    totalLimit: 20,
  })
  assert.equal(countOf({ remaining: 0, limit: 'total' }).limit, 'total')
  assert.equal(countOf({ remaining: 0 }).limit, 'visitor')
  assert.deepEqual(countOf(null), { remaining: null, limit: null, visitorLimit: null, totalLimit: null })
  assert.equal(countOf({ remaining: -1 }).remaining, null)
})

test('limit messages use the numbers from the server', () => {
  assert.equal(limitMessage('total', { totalLimit: 20 }), 'Daily limit reached (20 images a day). Try again tomorrow.')
  assert.equal(limitMessage('visitor', { visitorLimit: 1 }), "You've used your 1 image for today. Try again tomorrow.")
  assert.equal(limitMessage('visitor', {}), "You've used your images for today. Try again tomorrow.")
})
