import { create } from 'zustand'

const THEME_KEY = 'maketa-theme'
const root = document.documentElement
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch {
    return null
  }
}

// Layout state that must survive a mode switch (mode components unmount).
export const useUiStore = create((set) => ({
  // 'light' | 'dark'. The first value is set in index.html before the first
  // paint (saved choice, else the system setting); the store starts from it.
  theme: root.dataset.theme === 'dark' ? 'dark' : 'light',
  // A manual choice from the switch, saved so it survives a reload.
  setTheme: (theme) => {
    root.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage blocked: the choice still applies until reload.
    }
    set({ theme })
  },
  // Plan: width of the left control panel, in percent of the page.
  planPercent: 20,
  // Personalize: height of the top part (the images), in percent. Null until
  // the divider is dragged: the top part then fits the images exactly.
  personalizePercent: null,
  // Open or closed per Section id; a missing id means open (the default).
  openSections: {},
  frameVisible: true,
  // Plan's view (J.1): '2d' (from above), '3d' (orbit) or 'walk'.
  sceneView: '3d',
  // Plan: the object being moved right now (floor drag or move arrows) and
  // where the move started, { id, start: [x, z] }, for the label that shows
  // how far it moved (J0.3.1); null when none.
  moving: null,
  // Room configuration's short notice, e.g. "2 objects were moved inside the
  // room." after a new shape or leaving Build (J.4, J.5); null when none.
  // Here so it survives the switch from Build to Plan.
  roomNotice: null,

  setMoving: (moving) => set({ moving }),
  setRoomNotice: (roomNotice) => set({ roomNotice }),
  setSceneView: (sceneView) => set({ sceneView }),
  setPlanPercent: (planPercent) => set({ planPercent }),
  setPersonalizePercent: (personalizePercent) => set({ personalizePercent }),
  setSectionOpen: (id, open) =>
    set((state) => ({ openSections: { ...state.openSections, [id]: open } })),
  toggleFrame: () => set((state) => ({ frameVisible: !state.frameVisible })),
}))

// The notice after `moved` objects were pushed inside the walls, or null.
export function movedInsideNotice(moved) {
  if (!moved) return null
  return moved === 1 ? '1 object was moved inside the room.' : `${moved} objects were moved inside the room.`
}

// Without a manual choice, follow the system setting when it changes.
systemDark.addEventListener('change', (event) => {
  const saved = savedTheme()
  if (saved === 'light' || saved === 'dark') return
  const theme = event.matches ? 'dark' : 'light'
  root.dataset.theme = theme
  useUiStore.setState({ theme })
})
