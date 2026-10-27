import { create } from 'zustand'

// Layout state that must survive a mode switch (mode components unmount).
export const useUiStore = create((set) => ({
  // Plan: width of the left control panel, in percent of the page.
  planPercent: 20,
  // Personalize: width of the left side (the images), in percent of the page.
  personalizePercent: 60,
  // Open or closed per Section id; a missing id means open (the default).
  openSections: {},
  frameVisible: true,

  setPlanPercent: (planPercent) => set({ planPercent }),
  setPersonalizePercent: (personalizePercent) => set({ personalizePercent }),
  setSectionOpen: (id, open) =>
    set((state) => ({ openSections: { ...state.openSections, [id]: open } })),
  toggleFrame: () => set((state) => ({ frameVisible: !state.frameVisible })),
}))
