import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
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

test('the 2D view fits the whole room, centered, with space around it', () => {
  // A wide view: the room's depth decides. 5 m deep in 500 px, filling 80%.
  assert.deepEqual(fitTopView({ width: 6, depth: 5 }, 1000, 500), { center: [0, 0], zoom: 80 })
  // A tall view: the width decides.
  assert.deepEqual(fitTopView({ width: 6, depth: 5 }, 600, 2000), { center: [0, 0], zoom: 80 })
})

test('the 2D zoom stays inside its limits, also before the view has a size', () => {
  assert.equal(fitTopView({ width: 6, depth: 5 }, 0, 0).zoom, 50)
  assert.equal(fitTopView({ width: 0.5, depth: 0.5 }, 5000, 5000).zoom, TOP_MAX_ZOOM)
  assert.equal(fitTopView({ width: 100, depth: 100 }, 100, 100).zoom, TOP_MIN_ZOOM)
})

test('in 2D the arrow keys follow the screen: up is the back wall, right is +x', () => {
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowUp', 0.1), [0, -0.1])
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowDown', 0.1), [0, 0.1])
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowRight', 0.1), [0.1, 0])
  assert.deepEqual(nudgeOffset(TOP_NUDGE_VIEW, 'ArrowLeft', 0.1), [-0.1, 0])
})

const room = { width: 6, depth: 5, height: 2.6 }
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
  close(walkStep({ width: 2, depth: 2 }, [2, 2], [0, -1], [0, 0], 1), [0.75, 0.75])
  assert.deepEqual(clampInRoom(room, 10, -10), [2.75, -2.25])
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
