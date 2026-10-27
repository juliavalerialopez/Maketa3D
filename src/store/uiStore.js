import { create } from 'zustand'

// Layout state that must survive a mode switch (mode components unmount).
export const useUiStore = create((set) => ({
  // Plan: width of the left control panel, in percent of the page.
  planPercent: 20,
  // Open or closed per Section id; a missing id means open (the default).
  openSections: {},

  setPlanPercent: (planPercent) => set({ planPercent }),
  setSectionOpen: (id, open) =>
    set((state) => ({ openSections: { ...state.openSections, [id]: open } })),
}))
