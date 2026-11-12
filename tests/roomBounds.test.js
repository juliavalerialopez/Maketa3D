import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  clampPosition,
  normalizeDegrees,
  normalizeRadians,
  nudgeOffset,
  objectTransform,
  positionLimits,
  toDegrees,
  toRadians,
  wallDistances,
} from '../src/store/roomBounds.js'
import { rectangleCorners } from '../src/store/roomShape.js'

// A width x depth room centred on the origin, 2.6 m high.
const rect = (width, depth) => ({ height: 2.6, corners: rectangleCorners(width, depth) })
const room = rect(6, 5)
// A 4 x 4 L: the front right quarter is cut away (the front is +z, the right +x).
const lRoom = {
  height: 2.6,
  corners: [
    { x: -2, z: -2 },
    { x: 2, z: -2 },
    { x: 2, z: 0 },
    { x: 0, z: 0 },
    { x: 0, z: 2 },
    { x: -2, z: 2 },
  ],
}
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
  const turned = { ...sofa, position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] }
  const limits = positionLimits(turned, room)
  close(limits.x[1], 3 - 0.45)
  close(limits.z[1], 2.5 - 1)
})

test('an object wider than the room is centered on that axis', () => {
  const [x, , z] = clampPosition(sofa, rect(1.5, 5), 5, 10)
  close(x, 0)
  close(z, 2.05)
})

test('in an L room an object stays out of the cut away corner and slides along its walls', () => {
  const chair = { size: { width: 1, depth: 1, height: 0.8 }, rotation: [0, 0, 0] }
  // Pushed into the cut away corner from the back right leg: stops at its wall.
  assert.deepEqual(clampPosition(chair, lRoom, 1, 0.8), [1, 0, -0.5])
  // Inside the room it stays.
  assert.deepEqual(clampPosition(chair, lRoom, -1, 1), [-1, 0, 1])
  // In the front left leg it can only go as far right as the leg.
  const limits = positionLimits({ ...chair, position: [-1, 0, 1] }, lRoom)
  assert.deepEqual(limits.x, [-1.5, -0.5])
  assert.deepEqual(limits.z, [-1.5, 1.5])
  // Where the legs meet it can go across the whole room.
  assert.deepEqual(positionLimits({ ...chair, position: [-1, 0, -1] }, lRoom).x, [-1.5, 1.5])
})

test('in an L room the distance goes to the first wall in each direction', () => {
  const chair = { size: { width: 1, depth: 1, height: 0.8 }, rotation: [0, 0, 0], position: [-1, 0, 1] }
  const { right, front } = wallDistances(chair, lRoom)
  // To the cut away corner's wall at x = 0.
  close(right.distance, 0.5)
  close(right.to[0], 0)
  close(front.distance, 0.5)
})

test('the distances to the walls add up to the room size minus the footprint', () => {
  const placed = { ...sofa, position: [1, 0, -0.5] }
  const { left, right, back, front } = wallDistances(placed, room)
  close(left.distance, 3)
  close(right.distance, 1)
  close(back.distance, 1.55)
  close(front.distance, 2.55)
  close(left.distance + right.distance, 6 - 2)
  close(back.distance + front.distance, 5 - 0.9)
})

test('a turned object measures from its rotated footprint, with lines from each side to the wall', () => {
  const turned = { ...sofa, position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] }
  const { left, back } = wallDistances(turned, room)
  close(left.distance, 3 - 0.45)
  close(back.distance, 2.5 - 1)
  close(left.from[0], -0.45)
  close(left.to[0], -3)
  close(left.to[1], left.from[1])
  close(back.from[1], -1)
  close(back.to[0], back.from[0])
  close(back.to[1], -2.5)
})

test('an object against a wall is 0 from it', () => {
  const [x, , z] = clampPosition(sofa, room, 10, 10)
  const { right, front } = wallDistances({ ...sofa, position: [x, 0, z] }, room)
  close(right.distance, 0)
  close(front.distance, 0)
})

// Arrow keys (J0.5): relative to the screen, snapped to a room axis.
test('looking toward the back, Up moves to the back, Right to the right', () => {
  const view = { position: [0, 4, 5], target: [0, 0, 0] }
  assert.deepEqual(nudgeOffset(view, 'ArrowUp', 0.1), [0, -0.1])
  assert.deepEqual(nudgeOffset(view, 'ArrowDown', 0.1), [0, 0.1])
  assert.deepEqual(nudgeOffset(view, 'ArrowRight', 0.1), [0.1, 0])
  assert.deepEqual(nudgeOffset(view, 'ArrowLeft', 0.01), [-0.01, 0])
})

test('from the default corner view the keys snap to the nearest room axis', () => {
  // Looking from +x, a bit more than from +z: straight ahead is -x.
  const view = { position: [4.2, 4, 4], target: [0, 0, 0] }
  assert.deepEqual(nudgeOffset(view, 'ArrowUp', 0.1), [-0.1, 0])
  assert.deepEqual(nudgeOffset(view, 'ArrowRight', 0.1), [0, -0.1])
})

test('other keys do not nudge', () => {
  assert.equal(nudgeOffset({ position: [0, 4, 5], target: [0, 0, 0] }, 'Enter', 0.1), null)
})

test('angles convert between degrees and radians and stay within one turn', () => {
  close(toDegrees(Math.PI / 2), 90)
  close(toRadians(180), Math.PI)
  assert.equal(normalizeDegrees(-90), 270)
  assert.equal(normalizeDegrees(360), 0)
  assert.equal(normalizeDegrees(45), 45)
  close(normalizeRadians(-Math.PI / 2), (3 * Math.PI) / 2)
  close(normalizeRadians(2 * Math.PI), 0)
})

test('a tilted object is lifted so its lowest point touches the floor', () => {
  const onItsBack = { ...sofa, position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] }
  const { position } = objectTransform(onItsBack)
  close(position[1], 0.45)
})
