import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOP_MAX_ZOOM, TOP_MIN_ZOOM, TOP_NUDGE_VIEW, fitTopView } from '../src/components/scene/planViews.js'
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
