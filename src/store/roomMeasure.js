// Typing and checking room sizes (K.1.2). Plain JS, no React, so stores,
// panels and tests can use it.
import { MIN_WALL } from './roomShape.js'
import { openingLabel, openingsOf } from './openings.js'

// Allowed room sizes in meters: [min, max].
export const SIZE_LIMITS = {
  width: [1, 30],
  depth: [1, 30],
  height: [2, 6],
}

// A cut-out side is at least this long, and leaves at least this much of the
// room side.
export const CUTOUT_MIN = MIN_WALL
export const LEG_MIN = MIN_WALL

const DECIMALS = 1000
const round = (value) => Math.round(value * DECIMALS) / DECIMALS

// A typed size as a number: "4.5", "4,5", " 4,5 m " give 4.5. Anything else
// (empty text, letters, a minus sign, two separators, an exponent) gives null.
export function parseMeasure(text) {
  if (typeof text !== 'string') return null
  const cleaned = text.trim().replace(/\s*m$/i, '')
  if (!/^(\d+[.,]?\d*|[.,]\d+)$/.test(cleaned)) return null
  return Number(cleaned.replace(',', '.'))
}

const shown = (number) => String(round(number))

// Checks a size against [min, max]. Returns { ok: true, value } or
// { ok: false, reason, message }, `reason` 'number' or 'range'; nothing is
// clamped. `value` is a number or null (a text that did not parse).
export function validateMeasure(value, [min, max], name) {
  if (value === null || !Number.isFinite(value)) {
    return { ok: false, reason: 'number', message: `${name} must be a number, for example 4.5.` }
  }
  const rounded = round(value)
  if (rounded < min || rounded > max) {
    return { ok: false, reason: 'range', message: `${name} must be between ${shown(min)} and ${shown(max)} m.` }
  }
  return { ok: true, value: rounded }
}

// One arrow step: 0.1 m, or 1 m with Shift.
export function stepMeasure(value, direction, shift = false) {
  return round(value + Math.sign(direction) * (shift ? 1 : 0.1))
}

// The floor area in m² of a Standard or an L; `params` as in roomParams. A
// room shaped in Build has no formula: use roomArea(corners).
export function floorArea({ shape, width, depth, notchWidth = 0, notchDepth = 0 }) {
  return shape === 'l' ? width * depth - notchWidth * notchDepth : width * depth
}

export const formatArea = (area) => `${area.toFixed(1)} m²`

// The limits of one field, [min, max], for a room with `params`. Width and
// depth stay at least a leg longer than the cut-out, a cut-out side leaves a
// leg of the room side, and Height stays above the tallest door or window.
export function limitsFor(params, key, tallest = 0) {
  const isL = params.shape === 'l'
  if (key === 'width') return [Math.max(SIZE_LIMITS.width[0], isL ? params.notchWidth + LEG_MIN : 0), SIZE_LIMITS.width[1]]
  if (key === 'depth') return [Math.max(SIZE_LIMITS.depth[0], isL ? params.notchDepth + LEG_MIN : 0), SIZE_LIMITS.depth[1]]
  if (key === 'height') {
    const [min, max] = SIZE_LIMITS.height
    return [Math.min(max, Math.max(min, tallest)), max]
  }
  if (key === 'notchWidth') return [CUTOUT_MIN, params.width - LEG_MIN]
  if (key === 'notchDepth') return [CUTOUT_MIN, params.depth - LEG_MIN]
  return []
}

// The room shape for a name that may be an old one: Square and Rectangle are
// Standard now. Null for a name that is none of them.
export function normalizeShape(name) {
  if (name === 'square' || name === 'rectangle' || name === 'standard') return 'standard'
  if (name === 'l' || name === 'custom') return name
  return null
}

// Whether every door and window of `room` is still there, at its size, in
// `nextRoom` (the room after a size or shape change, with its openings
// fitted). Returns { ok: true } or { ok: false, name, message } for the first
// one that would be resized or left out.
export function openingsFit(room, nextRoom) {
  const after = openingsOf(nextRoom)
  for (const opening of openingsOf(room)) {
    const kept = after.find((item) => item.id === opening.id)
    const same = kept && kept.width === opening.width && kept.height === opening.height && kept.sill === opening.sill
    if (!same) {
      const name = openingLabel(room, opening)
      return { ok: false, name, message: `${name} would not fit. Move or remove it first.` }
    }
  }
  return { ok: true }
}
