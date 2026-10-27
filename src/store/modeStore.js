import { create } from 'zustand'

// The top-level mode.
export const useModeStore = create((set) => ({
  mode: 'plan',

  setMode: (mode) => set({ mode }),
}))
