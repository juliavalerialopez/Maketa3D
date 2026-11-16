import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  areaLabelPoint,
  axisStops,
  containsPoint,
  rectangleCorners,
  roomArea,
  roomWalls,
  splitWall,
} from '../src/store/roomShape.js'
import { gridFor } from '../src/components/scene/gridPoints.js'
import { dimensionsFor, wallDimensionsFor } from '../src/components/scene/dimensionLines.js'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)
// A 4 x 4 L: the front right quarter is cut away (the front is +z, the right +x).
const l = [
  { x: -2, z: -2 },
  { x: 2, z: -2 },
  { x: 2, z: 0 },
  { x: 0, z: 0 },
  { x: 0, z: 2 },
  { x: -2, z: 2 },
]

test('the room area and the stops of its corners along each axis (J.5.3)', () => {
  close(roomArea(rectangleCorners(5, 5)), 25)
  close(roomArea(rectangleCorners(6, 3.5)), 21)
  close(roomArea(l), 12)
  // The same area whichever way the corners go round.
  close(roomArea([...l].reverse()), 12)
  assert.deepEqual(axisStops(rectangleCorners(5, 4)), { xs: [-2.5, 2.5], zs: [-2, 2] })
  assert.deepEqual(axisStops(l), { xs: [-2, 0, 2], zs: [-2, 0, 2] })
  // A wall cut in the middle has a corner there, but the room does not turn: no stop.
  const cut = splitWall(rectangleCorners(5, 5), 1, 2.5)
  assert.equal(cut.length, 5)
  assert.deepEqual(axisStops(cut), { xs: [-2.5, 2.5], zs: [-2.5, 2.5] })
  assert.deepEqual(
    dimensionsFor(cut, 1.1).labels.map((label) => label.text),
    ['5.00', '5.00'],
  )
})

test('the area is written inside the floor, also for an L (J.5.3)', () => {
  const [x, z] = areaLabelPoint(l)
  close(x, -1 / 3)
  close(z, -1 / 3)
  assert.ok(containsPoint(l, x, z))
  const [offX, offZ] = areaLabelPoint(rectangleCorners(4, 2, 1, -2))
  close(offX, 1)
  close(offZ, -2)
})

test('the grid is a dotted line at every whole meter from the origin corner and a solid line every 5 m, inside the room only (J.5.2)', () => {
  // The origin corner is the front left, (-2.5, 2.5) in a 5 x 5 room.
  const whole = (value) => Math.abs(value - Math.round(value)) < 1e-6
  const small = gridFor(rectangleCorners(5, 5))
  assert.equal(small.lines.length, 0)
  // Every dot is on a dotted line: a whole meter from the left or from the front.
  assert.ok(small.dots.every(([x, z]) => whole(x + 2.5) || whole(2.5 - z)))
  // Each dotted line is a row of dots 0.1 m apart: 4 each way, 49 or so dots each, the crossings counted once.
  assert.ok(small.dots.length > 350 && small.dots.length < 400, `${small.dots.length} dots`)
  // The lines cross exactly on a dot, 1 m right and 1 m back from the origin corner.
  assert.ok(small.dots.some(([x, z]) => Math.abs(x + 1.5) < 1e-9 && Math.abs(z - 1.5) < 1e-9))
  // Dots 0.1 m apart along a line, and none on or near a wall.
  assert.ok(small.dots.some(([x, z]) => Math.abs(x + 1.5) < 1e-9 && Math.abs(z - 1.4) < 1e-9))
  assert.ok(small.dots.every(([x, z]) => Math.abs(x) < 2.45 && Math.abs(z) < 2.45))
  // 10 x 10: a solid line each way across the middle, kept off the walls.
  const big = gridFor(rectangleCorners(10, 10))
  assert.equal(big.lines.length, 2)
  const [x1, z1, x2, z2] = big.lines[0]
  close(x1, 0)
  close(x2, 0)
  assert.ok(Math.min(z1, z2) > -5 && Math.max(z1, z2) < 5 && Math.abs(z2 - z1) > 9.7)
  // The solid line takes the place of the dotted one: no dots on it.
  assert.ok(big.dots.every(([x, z]) => Math.abs(x) > 1e-6 && Math.abs(z) > 1e-6))
  assert.ok(big.dots.some(([x]) => Math.abs(x + 4) < 1e-6))
  // An L: no dot in the cut away corner or on a wall.
  const inL = gridFor(l)
  assert.ok(inL.dots.length > 0)
  assert.ok(inL.dots.every(([x, z]) => containsPoint(l, x, z)))
  assert.ok(inL.dots.every(([x, z]) => x < 0 || z < 0))
})

test('every wall gets a dimension line outside it with a tick at each end and its length (J.5.3)', () => {
  const walls = roomWalls(rectangleCorners(5, 4))
  const { lines, labels } = wallDimensionsFor(walls, 0.5)
  // A line and two ticks for each of the four walls, and a length for each.
  assert.equal(lines.length, 12)
  assert.deepEqual(
    labels.map((label) => label.text).sort(),
    ['4.00 m', '4.00 m', '5.00 m', '5.00 m'],
  )
  // The back wall (z -2) has its line 0.5 m behind it, at z -2.5, from x -2.5 to 2.5, ticks across it.
  const back = walls.findIndex((wall) => wall.normal[1] < 0)
  const [line, tickA, tickB] = lines.slice(back * 3, back * 3 + 3)
  assert.deepEqual([line[1], line[3]], [-2.5, -2.5])
  assert.deepEqual([Math.min(line[0], line[2]), Math.max(line[0], line[2])], [-2.5, 2.5])
  assert.deepEqual([tickA[1], tickA[3]].sort((a, b) => a - b), [-2.6, -2.4])
  assert.equal(tickA[0], tickA[2])
  assert.equal(tickB[0], tickB[2])
  // Its length is written in the middle of its line.
  close(labels[back].x, 0)
  close(labels[back].z, -2.5)
})

test('a rectangle has one whole-width and one whole-depth line; an L has a chain between its corners and the whole (J.5.3)', () => {
  const rect = dimensionsFor(rectangleCorners(5, 4), 1.1)
  assert.deepEqual(
    rect.labels.map((label) => label.text),
    ['5.00', '4.00'],
  )
  // Each has its line and two ticks.
  assert.equal(rect.lines.length, 6)
  assert.equal(rect.area.text, '20.0 m²')
  // The width line is behind the room: 1.1 m beyond its back wall at z -2.
  const [from, z, to] = [rect.lines[0][0], rect.lines[0][1], rect.lines[0][2]]
  assert.deepEqual([from, to], [-2.5, 2.5])
  close(z, -2 - 1.1)
  const shaped = dimensionsFor(l, 1.1)
  assert.deepEqual(
    shaped.labels.map((label) => label.text),
    ['2.00', '2.00', '4.00', '2.00', '2.00', '4.00'],
  )
  assert.equal(shaped.area.text, '12.0 m²')
})
