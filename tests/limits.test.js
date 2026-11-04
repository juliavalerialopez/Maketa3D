import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { limits, status } from '../api/_limits.js'
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
