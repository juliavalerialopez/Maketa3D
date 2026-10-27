import { create } from 'zustand'

// The top-level mode, and the Plan camera kept while Plan is not mounted.
export const useModeStore = create((set) => ({
  mode: 'plan',
  // Plan orbit camera: saved when Plan unmounts, applied when it mounts again.
  planView: { position: [4, 4, 4], target: [0, 0, 0] },

  setMode: (mode) => set({ mode }),
  setPlanView: (planView) => set({ planView }),
}))
