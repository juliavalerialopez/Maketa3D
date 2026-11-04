import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampPosition, objectTransform, positionLimits } from '../src/store/roomBounds.js'

const room = { width: 6, depth: 5, height: 2.6 }
const sofa = { size: { width: 2, depth: 0.9, height: 0.8 }, rotation: [0, 0, 0] }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

test('an object pushed past each wall stops at it', () => {
  assert.deepEqual(clampPosition(sofa, room, 10, 0), [2, 0, 0])
  assert.deepEqual(clampPosition(sofa, room, -10, 0), [-2, 0, 0])
  assert.deepEqual(clampPosition(sofa, room, 0, 10), [0, 0, 2.05])
  assert.deepEqual(clampPosition(sofa, room, 0, -10), [0, 0, -2.05])
})

test('an object inside the room keeps its position', () => {
  assert.deepEqual(clampPosition(sofa, room, 0.5, -1), [0.5, 0, -1])
})

test('a turned object uses its rotated footprint', () => {
  const turned = { ...sofa, rotation: [0, Math.PI / 2, 0] }
  const limits = positionLimits(turned, room)
  close(limits.x[1], 3 - 0.45)
  close(limits.z[1], 2.5 - 1)
})

test('an object wider than the room is centered on that axis', () => {
  const narrow = { width: 1.5, depth: 5, height: 2.6 }
  const [x] = clampPosition(sofa, narrow, 5, 0)
  close(x, 0)
})

test('a tilted object is lifted so its lowest point touches the floor', () => {
  const onItsBack = { ...sofa, position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] }
  const { position } = objectTransform(onItsBack)
  close(position[1], 0.45)
})
