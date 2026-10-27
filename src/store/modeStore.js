import { create } from 'zustand'

// The top-level mode, the Plan camera kept while Plan is not mounted, and the
// last Room render.
export const useModeStore = create((set) => ({
  mode: 'plan',
  // Plan orbit camera: saved when Plan unmounts, applied when it mounts again.
  planView: { position: [4, 4, 4], target: [0, 0, 0] },
  // Room render (PNG data URL) taken when switching to Personalize; memory only.
  snapshot: null,

  setMode: (mode) => set({ mode }),
  setPlanView: (planView) => set({ planView }),
  setSnapshot: (snapshot) => set({ snapshot }),
}))
