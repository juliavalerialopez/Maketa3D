import { create } from 'zustand'

// Allowed room size in meters, per dimension: [min, max]. Used by the Room
// inputs and by layout import.
export const ROOM_LIMITS = {
  width: [2, 10],
  depth: [2, 10],
  height: [2, 4],
}

// The room a new project starts with.
export const DEFAULT_ROOM = { width: 6, depth: 5, height: 2.6 }

export const useRoomStore = create((set) => ({
  room: { ...DEFAULT_ROOM },
  setRoomSize: (partial) =>
    set((state) => ({ room: { ...state.room, ...partial } })),
}))
