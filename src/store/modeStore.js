import { create } from 'zustand'

// The Plan camera's starting view (also used by New Project).
const DEFAULT_PLAN_VIEW = { position: [4, 4, 4], target: [0, 0, 0] }

// The top-level mode, the Plan camera kept while Plan is not mounted, and the
// last Room render.
export const useModeStore = create((set) => ({
  mode: 'plan',
  // Plan orbit camera: saved when Plan unmounts, applied when it mounts again.
  planView: DEFAULT_PLAN_VIEW,
  // Goes up on each resetPlanView, so a mounted Plan camera applies the reset.
  planViewResets: 0,
  // Room render (PNG data URL) taken when switching to Personalize; memory only.
  snapshot: null,

  setMode: (mode) => set({ mode }),
  setPlanView: (planView) => set({ planView }),
  resetPlanView: () =>
    set((state) => ({ planView: DEFAULT_PLAN_VIEW, planViewResets: state.planViewResets + 1 })),
  setSnapshot: (snapshot) => set({ snapshot }),
}))
