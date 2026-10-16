import { create } from 'zustand'

export const useRoomStore = create((set) => ({
  room: { width: 4, depth: 3, height: 2.6 },
  setRoomSize: (partial) =>
    set((state) => ({ room: { ...state.room, ...partial } })),
}))
