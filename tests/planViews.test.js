import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TOP_DIMENSION_MARGIN,
  TOP_MAX_ZOOM,
  TOP_MIN_ZOOM,
  TOP_NUDGE_VIEW,
  clampInRoom,
  fitTopView,
  lookAfterDrag,
  walkInput,
  walkStart,
  walkStep,
} from '../src/components/scene/planViews.js'
import { nudgeOffset } from '../src/store/roomBounds.js'
import { rectangleCorners } from '../src/store/roomShape.js'

// A width x depth room centred on the origin, 2.6 m high.
const rect = (width, depth) => ({ height: 2.6, corners: rectangleCorners(width, depth) })
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

test('the 2D view fits the whole room and the dimension lines beyond its back and left, centered, with space around it', () => {
  const margin = TOP_DIMENSION_MARGIN
  // The view reaches `margin` further to the back and the left, so its middle moves there.
  const center = [-margin / 2, -margin / 2]
  // A wide view: the depth decides. 5 m + margin deep in 500 px, filling 80%.
  const wide = fitTopView(rect(6, 5), 1000, 500)
  assert.deepEqual(wide.center, center)
  close([wide.zoom], [(500 * 0.8) / (5 + margin)])
  // A tall view: the width decides.
  const tall = fitTopView(rect(6, 5), 600, 2000)
  assert.deepEqual(tall.center, center)
  close([tall.zoom], [(600 * 0.8) / (6 + margin)])
})

test('the 2D zoom stays inside its limits, also before the view has a size', () => {
  assert.equal(fitTopView(rect(6, 5), 0, 0).zoom, 50)
  assert.equal(fitTopView(rect(0.5, 0.5), 5000, 5000).zoom, TOP_MAX_ZOOM)
  assert.equal(fitTopView(rect(100, 100), 100, 100).zoom, TOP_MIN_ZOOM)
})

test('in 2D the arrow keys follow the screen: up is the back wall, right is +x', () => {
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowUp', 0.1), [0, -0.1])
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowDown', 0.1), [0, 0.1])
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowRight', 0.1), [0.1, 0])
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowLeft', 0.1), [-0.1, 0])
})

const room = rect(6, 5)
const close = (actual, expected) =>
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-9, `${actual} is not ${expected}`))

test('Walk starts at the 3D camera, moved inside the walls, looking the same way but level', () => {
  // The default 3D camera is outside the room, up in a corner, looking at the middle.
  const start = walkStart(room, { position: [4, 4, 4], target: [0, 0, 0] })
  close(start.position, [2.75, 2.25])
  close(start.direction, [-Math.SQRT1_2, 0, -Math.SQRT1_2])
  // A camera inside stays where it is; looking straight down, Walk looks toward the back.
  const above = walkStart(room, { position: [1, 6, -1], target: [1, 0, -1] })
  assert.deepEqual(above, { position: [1, -1], direction: [0, 0, -1] })
})

test('the walk keys give forward and right, and opposite keys cancel out', () => {
  assert.deepEqual(walkInput(new Set(['KeyW'])), [1, 0])
  assert.deepEqual(walkInput(new Set(['ArrowDown', 'KeyA'])), [-1, -1])
  assert.deepEqual(walkInput(new Set(['KeyW', 'ArrowUp', 'KeyD'])), [1, 1])
  assert.deepEqual(walkInput(new Set(['KeyA', 'KeyD', 'ShiftLeft'])), [0, 0])
})

test('walking follows where the camera looks, level, at the same speed on a diagonal', () => {
  // Looking toward the back (-z): forward is -z, right is +x.
  close(walkStep(room, [0, 0], [0, -1], [1, 0], 1), [0, -1])
  close(walkStep(room, [0, 0], [0, -1], [0, 1], 1), [1, 0])
  // Looking toward +x, a little up or down: only the direction seen from above counts.
  close(walkStep(room, [0, 0], [0.2, 0], [1, 0], 1), [1, 0])
  close(walkStep(room, [0, 0], [1, 0], [0, 1], 1), [0, 1])
  // Forward and right together still walk 1 m.
  close(walkStep(room, [0, 0], [0, -1], [1, 1], 1), [Math.SQRT1_2, -Math.SQRT1_2])
})

test('the walls stop the walk 0.25 m before them, and it slides along them', () => {
  close(walkStep(room, [2.5, 0], [1, 0], [1, 0], 1), [2.75, 0])
  // Into the back wall at an angle: stops on z, keeps moving along x.
  close(walkStep(room, [0, -2.2], [1, -1], [1, 0], 1), [Math.SQRT1_2, -2.25])
  // Standing still in a room that just got smaller pushes the eyes back in.
  close(walkStep(rect(2, 2), [2, 2], [0, -1], [0, 0], 1), [0.75, 0.75])
  assert.deepEqual(clampInRoom(room, 10, -10), [2.75, -2.25])
})

test('in an L room the inner walls stop the walk too', () => {
  // Walking from the back right leg toward the front, into the cut away corner.
  close(walkStep(lRoom, [1, -0.5], [0, 1], [1, 0], 1), [1, -0.25])
  // From the front left leg toward the right.
  close(walkStep(lRoom, [-0.5, 1], [1, 0], [1, 0], 1), [-0.25, 1])
  // Where the legs meet, the walk goes on.
  close(walkStep(lRoom, [-1, -1], [1, 0], [1, 0], 1), [0, -1])
})

test('the 2D view of a room off the middle is centred on it (and its dimension lines)', () => {
  const room = { height: 2.6, corners: rectangleCorners(4, 2, 1, -2) }
  assert.deepEqual(fitTopView(room, 1000, 1000).center, [1 - TOP_DIMENSION_MARGIN / 2, -2 - TOP_DIMENSION_MARGIN / 2])
})

test('dragging the view turns the head with the room following the pointer', () => {
  const fov = (70 * Math.PI) / 180
  // A drag as tall as the view turns by the field of view.
  close(lookAfterDrag([0, 0], 500, 0, 500), [fov, 0])
  close(lookAfterDrag([1, 0], 0, -250, 500), [1, -fov / 2])
  // The head stops tilting at 85 degrees.
  close(lookAfterDrag([0, 0], 0, 5000, 500), [0, (85 * Math.PI) / 180])
  close(lookAfterDrag([0, 0], 0, -5000, 500), [0, (-85 * Math.PI) / 180])
})
