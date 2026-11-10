import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrowFor, movedText } from '../src/components/scene/moveText.js'

test('moves under 1 m show in centimeters, from 1 m in meters', () => {
  assert.equal(movedText(0.3), '30 cm')
  assert.equal(movedText(-0.304), '30 cm')
  assert.equal(movedText(0.996), '1 m')
  assert.equal(movedText(1), '1 m')
  assert.equal(movedText(1.2), '1.2 m')
  assert.equal(movedText(-1.254), '1.25 m')
})

test('the arrow follows the screen direction, in 45° steps', () => {
  assert.equal(arrowFor(1, 0), '→')
  assert.equal(arrowFor(0, 1), '↑')
  assert.equal(arrowFor(-1, 0), '←')
  assert.equal(arrowFor(0, -1), '↓')
  assert.equal(arrowFor(1, -1), '↘')
  assert.equal(arrowFor(-1, 1), '↖')
  assert.equal(arrowFor(1, 0.3), '→')
  assert.equal(arrowFor(1, 0.5), '↗')
})
