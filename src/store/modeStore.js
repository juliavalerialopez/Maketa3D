import { create } from 'zustand'

// The Plan camera's starting view (also used by New Project).
const DEFAULT_PLAN_VIEW = { position: [4, 4, 4], target: [0, 0, 0] }

// The top-level mode, the Plan camera kept while Plan is not mounted, and the
// Room renders of the camera slots.
export const useModeStore = create((set) => ({
  mode: 'plan',
  // Plan orbit camera: saved when Plan unmounts, applied when it mounts again.
  planView: DEFAULT_PLAN_VIEW,
  // Goes up on each resetPlanView or goToPlanView, so a mounted Plan camera
  // moves to the new view.
  planViewResets: 0,
  // Plan's 2D camera (J.1), { center: [x, z], zoom }: saved when the 2D view
  // closes, applied when it opens again. Null: fit the whole room.
  topView: null,
  // Goes up on each resetTopView, so an open 2D view fits the room again.
  topViewResets: 0,
  // Plan's Walk camera (J.1.2), { position: [x, z], direction: [x, y, z] }:
  // saved when Walk closes, so a mode switch keeps it. Null: start at the 3D
  // camera (choosing Walk, New Project, Open Project).
  walkView: null,
  // Goes up on each restartWalk, so an open Walk view starts again.
  walkViewResets: 0,
  // One Room render per camera slot, taken when switching to Personalize
  // (I.14.2); memory only. Each is { image, objects, view } or null (an empty
  // slot, or a render that failed):
  // - image: PNG data URL;
  // - objects: where each object's centre shows in it (H.7), [{ id, x, y,
  //   facing }], x and y in percent from the left and top, facing which way
  //   its front faces there (I.19, null without a front) (sent to the AI);
  // - view: the camera that took it (cameraView in services/frame.js), so
  //   in-frame checks use it and not the current Plan camera (H.6.2).
  // Not to be confused with a version's `roomRender` (restyleStore), which is
  // only the image (a data URL string) that version was made from.
  roomRenders: [],
  // The slot chosen in the Camera menu, whose render Personalize shows and
  // sends (selectRoomRender), or null when there is no render.
  renderSlot: null,

  setMode: (mode) => set({ mode }),
  setPlanView: (planView) => set({ planView }),
  resetPlanView: () =>
    set((state) => ({ planView: DEFAULT_PLAN_VIEW, planViewResets: state.planViewResets + 1 })),
  setTopView: (topView) => set({ topView }),
  setWalkView: (walkView) => set({ walkView }),
  // Walk starts again at the 3D camera (choosing Walk, New Project, Open
  // Project), also when it is open.
  restartWalk: () => set((state) => ({ walkView: null, walkViewResets: state.walkViewResets + 1 })),
  // The 2D view fits the room again (New Project, Open Project).
  resetTopView: () => set((state) => ({ topView: null, topViewResets: state.topViewResets + 1 })),
  // Moves the Plan camera to { position, target } (a camera slot, I.14.1).
  goToPlanView: ({ position, target }) =>
    set((state) => ({ planView: { position, target }, planViewResets: state.planViewResets + 1 })),
  // roomRenders: one takeSnapshot result (or null) per slot. The menu starts
  // on `activeSlot` (cameraSlotsStore) if it has a render, else on the first
  // slot that has one.
  setRoomRenders: (roomRenders, activeSlot) => {
    const start = roomRenders[activeSlot] ? activeSlot : roomRenders.findIndex(Boolean)
    set({ roomRenders, renderSlot: start === -1 ? null : start })
  },
  // Only a slot with a render can be chosen.
  setRenderSlot: (renderSlot) =>
    set((state) => (state.roomRenders[renderSlot] ? { renderSlot } : {})),
}))

// The Room render of the chosen camera ({ image, objects, view }), or null.
export const selectRoomRender = (state) => state.roomRenders[state.renderSlot] ?? null
