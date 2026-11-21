import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SIZE_LIMITS,
  floorArea,
  formatArea,
  limitsFor,
  normalizeShape,
  openingsFit,
  parseMeasure,
  stepMeasure,
  validateMeasure,
} from '../src/store/roomMeasure.js'
import { DEFAULT_ROOM, reshapedRoom, resizedRoom, roomParams } from '../src/store/roomStore.js'
import { lCorners, rectangleCorners, roomArea } from '../src/store/roomShape.js'

test('a typed size takes a comma or a dot, spaces and an m', () => {
  assert.equal(parseMeasure('4.5'), 4.5)
  assert.equal(parseMeasure('4,5'), 4.5)
  assert.equal(parseMeasure('  4,5 m '), 4.5)
  assert.equal(parseMeasure('4'), 4)
  assert.equal(parseMeasure('.5'), 0.5)
  assert.equal(parseMeasure('4.'), 4)
})

test('text that is not one size gives null', () => {
  for (const text of ['', ' ', 'abc', '-', '-1', '1,2,3', '1.2.3', '1.234,5', '1e3', '4,5 cm', '4 5', null, undefined, 4]) {
    assert.equal(parseMeasure(text), null, String(text))
  }
})

test('a size inside the limits is accepted and rounded to the millimeter', () => {
  assert.deepEqual(validateMeasure(4.5, SIZE_LIMITS.width, 'Width'), { ok: true, value: 4.5 })
  assert.deepEqual(validateMeasure(1, SIZE_LIMITS.width, 'Width'), { ok: true, value: 1 })
  assert.deepEqual(validateMeasure(30, SIZE_LIMITS.width, 'Width'), { ok: true, value: 30 })
  assert.deepEqual(validateMeasure(4.12345, SIZE_LIMITS.width, 'Width'), { ok: true, value: 4.123 })
})

test('a size outside the limits or not a number is refused with a message, never clamped', () => {
  const range = (message) => ({ ok: false, reason: 'range', message })
  assert.deepEqual(validateMeasure(31, SIZE_LIMITS.width, 'Width'), range('Width must be between 1 and 30 m.'))
  assert.deepEqual(validateMeasure(0.5, SIZE_LIMITS.depth, 'Depth'), range('Depth must be between 1 and 30 m.'))
  assert.deepEqual(validateMeasure(7, SIZE_LIMITS.height, 'Height'), range('Height must be between 2 and 6 m.'))
  assert.deepEqual(validateMeasure(null, SIZE_LIMITS.width, 'Width'), {
    ok: false,
    reason: 'number',
    message: 'Width must be a number, for example 4.5.',
  })
  assert.equal(validateMeasure(NaN, SIZE_LIMITS.width, 'Width').ok, false)
})

test('the arrows step 0.1 m, Shift 1 m, without floating point noise', () => {
  assert.equal(stepMeasure(0.1, 1), 0.2)
  assert.equal(stepMeasure(0.2, 1), 0.3)
  assert.equal(stepMeasure(5, -1), 4.9)
  assert.equal(stepMeasure(5, 1, true), 6)
  assert.equal(stepMeasure(5, -1, true), 4)
})

test('the floor area is width x depth, an L less its cut-out, and matches the corners', () => {
  assert.equal(floorArea({ shape: 'standard', width: 5, depth: 4 }), 20)
  assert.equal(floorArea({ shape: 'l', width: 5, depth: 4, notchWidth: 2, notchDepth: 1.5 }), 17)
  const rectangle = { ...DEFAULT_ROOM, corners: rectangleCorners(5, 4) }
  assert.ok(Math.abs(floorArea(roomParams(rectangle)) - roomArea(rectangle.corners)) < 1e-9)
  const l = { ...DEFAULT_ROOM, shape: 'l', corners: lCorners(6, 5, 2, 1.5, 2) }
  assert.ok(Math.abs(floorArea(roomParams(l)) - roomArea(l.corners)) < 1e-9)
})

test('the area shows with one decimal', () => {
  assert.equal(formatArea(25), '25.0 m²')
  assert.equal(formatArea(20.25), '20.3 m²')
  assert.equal(formatArea(17), '17.0 m²')
})

test('limits per field: sizes, a cut-out and the height above the tallest opening', () => {
  const standard = { shape: 'standard', width: 5, depth: 4, height: 2.6 }
  assert.deepEqual(limitsFor(standard, 'width'), [1, 30])
  assert.deepEqual(limitsFor(standard, 'depth'), [1, 30])
  assert.deepEqual(limitsFor(standard, 'height'), [2, 6])
  assert.deepEqual(limitsFor(standard, 'height', 2.05), [2.05, 6])
  assert.deepEqual(limitsFor(standard, 'height', 7), [6, 6])
  const l = { shape: 'l', width: 6, depth: 5, height: 2.6, notchWidth: 2, notchDepth: 1.5 }
  assert.deepEqual(limitsFor(l, 'width'), [2.5, 30])
  assert.deepEqual(limitsFor(l, 'depth'), [2, 30])
  assert.deepEqual(limitsFor(l, 'notchWidth'), [0.5, 5.5])
  assert.deepEqual(limitsFor(l, 'notchDepth'), [0.5, 4.5])
  assert.deepEqual(limitsFor(l, 'unknown'), [])
})

test('Width and Depth stay at least 0.5 m above the cut-out, never under 1 m', () => {
  const small = { shape: 'l', width: 2, depth: 2, notchWidth: 0.5, notchDepth: 0.5 }
  assert.deepEqual(limitsFor(small, 'width'), [1, 30])
  const wide = { shape: 'l', width: 6, depth: 5, notchWidth: 4, notchDepth: 4 }
  assert.deepEqual(limitsFor(wide, 'width'), [4.5, 30])
  assert.deepEqual(limitsFor(wide, 'depth'), [4.5, 30])
})

test('Square and Rectangle are Standard; an unknown name is nothing', () => {
  assert.equal(normalizeShape('square'), 'standard')
  assert.equal(normalizeShape('rectangle'), 'standard')
  assert.equal(normalizeShape('standard'), 'standard')
  assert.equal(normalizeShape('l'), 'l')
  assert.equal(normalizeShape('custom'), 'custom')
  assert.equal(normalizeShape('round'), null)
  assert.equal(normalizeShape(undefined), null)
})

const door = { id: 'door-a', type: 'door', wallIndex: 0, offset: 1, width: 0.9, height: 2.05, sill: 0 }
const withDoor = { ...DEFAULT_ROOM, openings: [door] }

test('a size change that keeps every door and window as it is fits', () => {
  assert.deepEqual(openingsFit(withDoor, resizedRoom(withDoor, { width: 4 })), { ok: true })
  assert.deepEqual(openingsFit(withDoor, resizedRoom(withDoor, { width: 1.5 })), { ok: true })
  assert.deepEqual(openingsFit(DEFAULT_ROOM, resizedRoom(DEFAULT_ROOM, { width: 1 })), { ok: true })
})

test('a wall too short for a door refuses the size and names the door', () => {
  const result = openingsFit(withDoor, resizedRoom(withDoor, { width: 1 }))
  assert.deepEqual(result, { ok: false, name: 'Door 1', message: 'Door 1 would not fit. Move or remove it first.' })
})

test('a ceiling lower than a door refuses the height', () => {
  const result = openingsFit(withDoor, resizedRoom(withDoor, { height: 2 }))
  assert.equal(result.ok, false)
  assert.equal(result.name, 'Door 1')
  assert.deepEqual(openingsFit(withDoor, resizedRoom(withDoor, { height: 2.1 })), { ok: true })
})

test('a new shape that keeps the door as it is fits', () => {
  assert.deepEqual(openingsFit(withDoor, reshapedRoom(withDoor, 'l')), { ok: true })
})

test('the name counts doors and windows per type, and only the one in the way is named', () => {
  const window = { id: 'win-a', type: 'window', wallIndex: 1, offset: 1, width: 1.2, height: 1.2, sill: 0.9 }
  const room = { ...DEFAULT_ROOM, linked: false, openings: [door, window] }
  const result = openingsFit(room, resizedRoom(room, { depth: 1 }))
  assert.deepEqual(result, { ok: false, name: 'Window 1', message: 'Window 1 would not fit. Move or remove it first.' })
})
