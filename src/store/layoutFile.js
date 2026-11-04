import { DEFAULT_ROOM, ROOM_LIMITS, useRoomStore } from './roomStore'
import { useObjectsStore } from './objectsStore'
import { useModeStore } from './modeStore'
import { clampPosition } from './roomBounds'
import { OBJECT_TYPES } from '../components/objects/catalog'
import { saveBlob } from '../services/download'

// The layout file: room size and objects, saved as JSON and read back
// (see the Part G spec).
// Only Y rotation is kept, in whole degrees 0-359; tilt and size are not
// saved (size comes from the catalog, or from screenInches for a TV stand).
// A hidden object (H.6.2) has "hidden": true; shown objects have no flag, so
// files from before the Hide switch still import.
export const LAYOUT_VERSION = 1
export const LAYOUT_FILE_NAME = 'maketa-layout.json'

const DEGREES_PER_RADIAN = 180 / Math.PI
// Millimetres are enough; this hides float noise like 1.2000000000000002.
const roundMeters = (meters) => Math.round(meters * 1000) / 1000
const wholeDegrees = (radians) => ((Math.round(radians * DEGREES_PER_RADIAN) % 360) + 360) % 360

// The current room and objects, in the file format.
export function layoutData() {
  const { room } = useRoomStore.getState()
  const { objects } = useObjectsStore.getState()
  return {
    version: LAYOUT_VERSION,
    room: { width: room.width, depth: room.depth, height: room.height },
    objects: objects.map((object) => ({
      type: object.type,
      number: object.number,
      x: roundMeters(object.position[0]),
      z: roundMeters(object.position[2]),
      rotation: wholeDegrees(object.rotation[1]),
      color: object.color,
      ...(object.screenInches !== undefined && { screenInches: object.screenInches }),
      ...(object.hidden && { hidden: true }),
    })),
  }
}

// Downloads the current layout as a JSON file, maketa-layout.json unless a
// file name is given. No server involved.
export function exportLayout(fileName = LAYOUT_FILE_NAME) {
  const json = JSON.stringify(layoutData(), null, 2)
  saveBlob(new Blob([json], { type: 'application/json' }), fileName)
}

// A new project: the default room, no objects, numbering from 1 again, and
// the Plan camera back at its starting view.
export function newLayout() {
  useRoomStore.getState().setRoomSize({ ...DEFAULT_ROOM })
  useObjectsStore.getState().replaceObjects([], {})
  useModeStore.getState().resetPlanView()
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const isWhole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max
const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

function isValidRoom(room) {
  return (
    isRecord(room) &&
    Object.entries(ROOM_LIMITS).every(
      ([key, [min, max]]) => isNumber(room[key]) && room[key] >= min && room[key] <= max,
    )
  )
}

function isValidObject(item) {
  if (!isRecord(item) || !Object.hasOwn(OBJECT_TYPES, item.type)) return false
  const screen = OBJECT_TYPES[item.type].screenInches
  return (
    isWhole(item.number, 1, Infinity) &&
    isNumber(item.x) &&
    isNumber(item.z) &&
    isNumber(item.rotation) &&
    isHexColor(item.color) &&
    (!screen || isWhole(item.screenInches, screen.min, screen.max)) &&
    (item.hidden === undefined || typeof item.hidden === 'boolean')
  )
}

// The file's content as a layout, or null if it is not a valid layout file.
function parseLayout(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const valid =
    isRecord(data) &&
    data.version === LAYOUT_VERSION &&
    isValidRoom(data.room) &&
    Array.isArray(data.objects) &&
    data.objects.every(isValidObject)
  return valid ? data : null
}

// Replaces the room and objects with the layout in `text` (a file's content).
// Returns false and changes nothing if the file is not a valid layout.
// Positions are clamped inside the walls, tilt is 0, the selection is
// cleared, and numbers continue after the highest imported one per type.
export function importLayout(text) {
  const layout = parseLayout(text)
  if (!layout) return false

  const room = {
    width: layout.room.width,
    depth: layout.room.depth,
    height: layout.room.height,
  }
  const lastNumbers = {}
  const objects = layout.objects.map((item) => {
    const entry = OBJECT_TYPES[item.type]
    const size = entry.screenInches ? entry.sizeFor(item.screenInches) : { ...entry.size }
    const degrees = ((item.rotation % 360) + 360) % 360
    const rotation = [0, degrees / DEGREES_PER_RADIAN, 0]
    lastNumbers[item.type] = Math.max(lastNumbers[item.type] ?? 0, item.number)
    return {
      id: crypto.randomUUID(),
      type: item.type,
      number: item.number,
      position: clampPosition({ size, rotation }, room, item.x, item.z),
      rotation,
      size,
      color: item.color,
      ...(entry.screenInches && { screenInches: item.screenInches }),
      ...(item.hidden === true && { hidden: true }),
    }
  })

  useRoomStore.getState().setRoomSize(room)
  useObjectsStore.getState().replaceObjects(objects, lastNumbers)
  return true
}
