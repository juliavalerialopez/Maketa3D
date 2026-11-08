import { DEFAULT_ROOM, ROOM_LIMITS, useRoomStore } from './roomStore.js'
import { useObjectsStore } from './objectsStore.js'
import { useModeStore } from './modeStore.js'
import { useHistoryStore } from './historyStore.js'
import { SLOT_COUNT, useCameraSlotsStore } from './cameraSlotsStore.js'
import { useProjectStore } from './projectStore.js'
import { clampPosition, normalizeDegrees, toDegrees, toRadians } from './roomBounds.js'
import { OBJECT_TYPES } from '../components/objects/catalog.js'
import { saveBlob } from '../services/download.js'
import { canPickFiles, pickFileToOpen, pickFileToSave, writeFile } from '../services/projectFile.js'

export { canPickFiles }

// The layout file: room size and objects, saved as JSON and read back
// (see the Part G spec).
// Only Y rotation is kept, in whole degrees 0-359; tilt and size are not
// saved (size comes from the catalog, or from screenInches for a TV stand).
// A hidden object (H.6.2) has "hidden": true; shown objects have no flag, so
// files from before the Hide switch still import.
// "cameras" (I.14.3) has one entry per camera slot: null (empty) or
// { x, y, z, targetX, targetY, targetZ, fov } (meters, fov in degrees).
// Thumbnails are not saved. Files without it open with all slots empty.
export const LAYOUT_VERSION = 1
export const LAYOUT_FILE_NAME = 'maketa-layout.json'

// Millimetres are enough; this hides float noise like 1.2000000000000002.
const roundMeters = (meters) => Math.round(meters * 1000) / 1000
const wholeDegrees = (radians) => normalizeDegrees(Math.round(toDegrees(radians)))
// A hundredth of a degree is enough for a camera's field of view.
const roundFov = (degrees) => Math.round(degrees * 100) / 100

// A camera slot's view ({ position, target, fov }) in the file format.
function cameraData({ position, target, fov }) {
  const [x, y, z] = position.map(roundMeters)
  const [targetX, targetY, targetZ] = target.map(roundMeters)
  return { x, y, z, targetX, targetY, targetZ, fov: roundFov(fov) }
}

// The current room, objects and camera slots, in the file format.
export function layoutData() {
  const { room } = useRoomStore.getState()
  const { objects } = useObjectsStore.getState()
  const { slots } = useCameraSlotsStore.getState()
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
    cameras: slots.map((slot) => (slot ? cameraData(slot.view) : null)),
  }
}

const layoutJson = () => JSON.stringify(layoutData(), null, 2)

// Downloads the current layout as a JSON file, maketa-layout.json unless a
// file name is given. No server involved.
export function exportLayout(fileName = LAYOUT_FILE_NAME) {
  saveBlob(new Blob([layoutJson()], { type: 'application/json' }), fileName)
}

// The project's file name to start the Save as window on (or to download as).
function projectFileName() {
  const { name } = useProjectStore.getState()
  return name ? `${name}.json` : LAYOUT_FILE_NAME
}

// Open, Save and Save As (I.17) answer 'done', 'cancelled' (a system window
// closed with Cancel), 'invalid' (Open: not a valid layout file, nothing
// changed) or 'failed' (Save: the file could not be written; the project's
// file stays as it was).

// Writes the layout into `handle`'s file, which becomes the project's file.
async function writeInto(handle) {
  try {
    await writeFile(handle, layoutJson())
  } catch {
    return 'failed'
  }
  useProjectStore.getState().setFile(handle.name, handle)
  return 'done'
}

// Opens a layout file from the system Open window (canPickFiles only), so
// Save can write back into it.
export async function openProject() {
  let handle
  try {
    handle = await pickFileToOpen()
  } catch {
    return 'invalid'
  }
  if (!handle) return 'cancelled'
  return openFrom(() => handle.getFile(), handle.name, handle)
}

// Opens a layout file chosen in a file input (browsers without file access).
// Save then downloads under its name.
export function openProjectFile(file) {
  return openFrom(() => file, file.name, null)
}

// Imports the file that `getFile` gives; on success it is the project's file.
// A file that cannot be read counts as invalid.
async function openFrom(getFile, fileName, handle) {
  let ok = false
  try {
    ok = importLayout(await (await getFile()).text())
  } catch {
    // Unreadable file: treated as invalid.
  }
  if (!ok) return 'invalid'
  useProjectStore.getState().setFile(fileName, handle)
  return 'done'
}

// Save: into the project's file without asking. With no file yet (a new
// project) it works like Save As; without file access it downloads.
export async function saveProject() {
  const { handle } = useProjectStore.getState()
  if (handle) return writeInto(handle)
  if (canPickFiles()) return saveProjectAs()
  exportLayout(projectFileName())
  return 'done'
}

// Save As: the system Save as window, then the chosen file is the project's
// file. Without file access, `fileName` comes from the Maketa name dialog and
// the layout is downloaded under it.
export async function saveProjectAs(fileName) {
  if (!canPickFiles()) {
    exportLayout(fileName)
    useProjectStore.getState().setFile(fileName)
    return 'done'
  }
  let handle
  try {
    handle = await pickFileToSave(projectFileName())
  } catch {
    return 'failed'
  }
  return handle ? writeInto(handle) : 'cancelled'
}

// A new project: the default room, no objects, numbering from 1 again, the
// Plan camera back at its starting view, empty camera slots (I.14.3), no
// undo history (I.11), and no file yet (I.17: the next Save asks).
export function newLayout() {
  useRoomStore.getState().setRoomSize({ ...DEFAULT_ROOM })
  useObjectsStore.getState().replaceObjects([], {})
  useModeStore.getState().resetPlanView()
  useCameraSlotsStore.getState().clearSlots()
  useHistoryStore.getState().clear()
  useProjectStore.getState().clearFile()
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

// A camera entry: null, or numbers for its place, target and field of view
// (more than 0 and less than 180 degrees), looking somewhere (target not at
// the camera's place).
function isValidCamera(camera) {
  if (camera === null) return true
  if (!isRecord(camera)) return false
  const keys = ['x', 'y', 'z', 'targetX', 'targetY', 'targetZ', 'fov']
  if (!keys.every((key) => isNumber(camera[key]))) return false
  const looksSomewhere = camera.x !== camera.targetX || camera.y !== camera.targetY || camera.z !== camera.targetZ
  return camera.fov > 0 && camera.fov < 180 && looksSomewhere
}

// "cameras" is optional (older files); when there, one valid entry per slot.
function isValidCameras(cameras) {
  return cameras === undefined || (Array.isArray(cameras) && cameras.length === SLOT_COUNT && cameras.every(isValidCamera))
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
    data.objects.every(isValidObject) &&
    isValidCameras(data.cameras)
  return valid ? data : null
}

// A file camera entry as a camera slot's view, or null.
function slotView(camera) {
  if (!camera) return null
  return {
    position: [camera.x, camera.y, camera.z],
    target: [camera.targetX, camera.targetY, camera.targetZ],
    fov: camera.fov,
  }
}

// Replaces the room, objects and camera slots with the layout in `text` (a
// file's content). Returns false and changes nothing if the file is not a
// valid layout. Positions are clamped inside the walls, tilt is 0, the
// selection is cleared, and numbers continue after the highest imported one
// per type. Camera slots come back without thumbnails; the Plan scene draws
// them (SnapshotBridge).
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
    const rotation = [0, toRadians(normalizeDegrees(item.rotation)), 0]
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
  const cameras = layout.cameras ?? Array.from({ length: SLOT_COUNT }, () => null)
  useCameraSlotsStore.getState().restoreSlots(cameras.map(slotView))
  // An opened project starts without undo history (I.11).
  useHistoryStore.getState().clear()
  return true
}
