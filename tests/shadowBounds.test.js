import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shadowBounds } from '../src/components/scene/shadowBounds.js'
import { rectangleCorners } from '../src/store/roomShape.js'

test('a room up to 5 x 5 m keeps the first shadow box and map', () => {
  assert.deepEqual(shadowBounds(rectangleCorners(5, 5)), { reach: 5, mapSize: 512 })
  assert.deepEqual(shadowBounds(rectangleCorners(2, 2)), { reach: 5, mapSize: 512 })
})

test('a larger room gets a shadow box over all its corners and a bigger map', () => {
  const { reach, mapSize } = shadowBounds(rectangleCorners(30, 30))
  assert.ok(reach > Math.hypot(15, 15))
  assert.equal(mapSize, 512 * Math.ceil(reach / 5))
})

test('a room off the middle reaches its farthest corner, and the map has a limit', () => {
  const { reach, mapSize } = shadowBounds(rectangleCorners(30, 30, 40, 40))
  assert.ok(reach > Math.hypot(55, 55))
  assert.equal(mapSize, 4096)
})
