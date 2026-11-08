import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { SLOT_COUNT, slotName, useCameraSlotsStore } from '../src/store/cameraSlotsStore.js'

const slots = () => useCameraSlotsStore.getState()
const slot = (x) => ({ view: { position: [x, 2, 4], target: [0, 0, 0], fov: 50 }, thumbnail: 'data:image/jpeg;base64,AA' })

beforeEach(() => slots().clearSlots())

test('there are three empty slots, named Camera 1 to Camera 3', () => {
  assert.equal(SLOT_COUNT, 3)
  assert.deepEqual(slots().slots, [null, null, null])
  assert.equal(slotName(2), 'Camera 3')
})

test('saving a slot fills it and makes it active', () => {
  slots().saveSlot(1, slot(1))
  assert.deepEqual(slots().slots, [null, slot(1), null])
  assert.equal(slots().activeSlot, 1)
})

test('updating a slot replaces its view', () => {
  slots().saveSlot(0, slot(1))
  slots().saveSlot(0, slot(2))
  assert.deepEqual(slots().slots[0], slot(2))
})

test('removing the active slot empties it and leaves no slot active', () => {
  slots().saveSlot(0, slot(1))
  slots().saveSlot(2, slot(3))
  slots().clearSlot(2)
  assert.deepEqual(slots().slots, [slot(1), null, null])
  assert.equal(slots().activeSlot, null)
})

test('removing another slot keeps the active one', () => {
  slots().saveSlot(0, slot(1))
  slots().saveSlot(2, slot(3))
  slots().clearSlot(0)
  assert.equal(slots().activeSlot, 2)
})
