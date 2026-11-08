import { create } from 'zustand'

// The Plan camera's starting view (also used by New Project).
const DEFAULT_PLAN_VIEW = { position: [4, 4, 4], target: [0, 0, 0] }

// The top-level mode, the Plan camera kept while Plan is not mounted, and the
// last Room render.
export const useModeStore = create((set) => ({
  mode: 'plan',
  // Plan orbit camera: saved when Plan unmounts, applied when it mounts again.
  planView: DEFAULT_PLAN_VIEW,
  // Goes up on each resetPlanView or goToPlanView, so a mounted Plan camera
  // moves to the new view.
  planViewResets: 0,
  // The last Room render, taken when switching to Personalize; memory only
  // (I.12). { image, objects, view } or null:
  // - image: PNG data URL;
  // - objects: where each object's centre shows in it (H.7), [{ id, x, y }],
  //   x and y in percent from the left and top (sent to the AI);
  // - view: the camera that took it (cameraView in services/frame.js), so
  //   in-frame checks use it and not the current Plan camera (H.6.2).
  // Not to be confused with a version's `roomRender` (restyleStore), which is
  // only the image (a data URL string) that version was made from.
  roomRender: null,

  setMode: (mode) => set({ mode }),
  setPlanView: (planView) => set({ planView }),
  resetPlanView: () =>
    set((state) => ({ planView: DEFAULT_PLAN_VIEW, planViewResets: state.planViewResets + 1 })),
  // Moves the Plan camera to { position, target } (a camera slot, I.14.1).
  goToPlanView: ({ position, target }) =>
    set((state) => ({ planView: { position, target }, planViewResets: state.planViewResets + 1 })),
  // roomRender: what takeSnapshot returns ({ image, objects, view }), or null.
  setRoomRender: (roomRender) => set({ roomRender: roomRender ?? null }),
}))
