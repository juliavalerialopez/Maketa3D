import { useRoomStore } from './roomStore'
import { useObjectsStore } from './objectsStore'

// The layout file: room size and objects, saved as JSON (see the Part G spec).
// Only Y rotation is kept, in whole degrees 0-359; tilt and size are not
// saved (size comes from the catalog, or from screenInches for a TV stand).
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
    })),
  }
}

// Downloads the current layout as maketa-layout.json. No server involved.
export function exportLayout() {
  const json = JSON.stringify(layoutData(), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = LAYOUT_FILE_NAME
  link.click()
  URL.revokeObjectURL(url)
}
