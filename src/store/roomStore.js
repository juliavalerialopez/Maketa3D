import { create } from 'zustand'
import { boundingBox, rectangleCorners } from './roomShape.js'

// Allowed room size in meters, per dimension: [min, max]. Width and depth are
// the room's size seen from above (its corners' bounding box). Used by the
// Room inputs and by layout import.
export const ROOM_LIMITS = {
  width: [2, 10],
  depth: [2, 10],
  height: [2, 4],
}

// The room a new project starts with: { height, corners } (J.2), corners as
// in roomShape.js, in world space with the front wall at +z.
export const DEFAULT_ROOM = { height: 2.6, corners: rectangleCorners(6, 5) }

// The room's size seen from above: { width, depth } of its bounding box.
export function roomSize(room) {
  const { width, depth } = boundingBox(room.corners)
  return { width, depth }
}

// The room with a new { width, depth, height } (each optional). A new width
// or depth makes it a rectangle of that size around the same middle (the
// Room inputs until the shape buttons, J.4).
export function resizedRoom(room, { width, depth, height }) {
  const next = { ...room }
  if (height !== undefined) next.height = height
  if (width !== undefined || depth !== undefined) {
    const box = boundingBox(room.corners)
    next.corners = rectangleCorners(width ?? box.width, depth ?? box.depth, box.centerX, box.centerZ)
  }
  return next
}

export const useRoomStore = create((set) => ({
  room: DEFAULT_ROOM,
  // { width, depth, height }, each optional (resizedRoom).
  setRoomSize: (size) => set((state) => ({ room: resizedRoom(state.room, size) })),
  // Replaces the whole room (New Project, Open Project).
  setRoom: (room) => set({ room }),
}))
