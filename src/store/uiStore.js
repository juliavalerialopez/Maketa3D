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
  // room." after a new shape or a wall drag (J.4, K.1.15); null when none.
  roomNotice: null,
  // Plan's 2D view (J.7, K.1.15): the selected wall as its two corners, { a: { x, z }, b },
  // so it stays selected when the walls are renumbered; null when none.
  selectedWall: null,
  // The wall tool that is on, or null: 'cut' (J.7.1: a click splits a
  // wall), 'door' (J.8.1: a click places a door) or 'window' (J.8.2: a
  // click where it starts, a second where it ends).
  tool: null,
  // The selected door or window's id, or null. A wall and an opening are never
  // selected together.
  selectedOpening: null,
  // A short message at the bottom of the view (J.8), e.g. why a wall stopped;
  // null when none.
  sceneNotice: null,
  // The walls (their numbers) that the Room configuration field under the
  // pointer changes, highlighted in the view (J.4.2); empty when none.
  highlightedWalls: [],
  // True while the pointer is over Height: the walls' top edge lights up.
  highlightedTop: false,

  setMoving: (moving) => set({ moving }),
  selectWall: (selectedWall) =>
    set((state) => ({ selectedWall, tool: null, selectedOpening: selectedWall ? null : state.selectedOpening })),
  selectOpening: (selectedOpening) =>
    set((state) => ({ selectedOpening, selectedWall: selectedOpening ? null : state.selectedWall, tool: null })),
  setSceneNotice: (sceneNotice) => set({ sceneNotice }),
  // The highlight for a Room configuration field (J.4.2): the walls it moves,
  // and whether the walls' top edge lights up (Height).
  setHighlight: (highlightedWalls, highlightedTop = false) => set({ highlightedWalls, highlightedTop }),
  setTool: (tool) => set({ tool }),
  setRoomNotice: (roomNotice) => set({ roomNotice }),
  // Walk is for looking only (J.1.2): a placing tool (J.9.4) ends there.
  setSceneView: (sceneView) => set((state) => ({ sceneView, tool: sceneView === 'walk' ? null : state.tool })),
  setPlanPercent: (planPercent) => set({ planPercent }),
  setPersonalizePercent: (personalizePercent) => set({ personalizePercent }),
  setSectionOpen: (id, open) =>
    set((state) => ({ openSections: { ...state.openSections, [id]: open } })),
  toggleFrame: () => set((state) => ({ frameVisible: !state.frameVisible })),
}))

// The scene's messages (J.8): why a wall or a cut did not happen.
export const SCENE_NOTICES = {
  openings: 'A door or window would no longer fit its wall.',
  cut: 'A door or window is in the way of the cut.',
}

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
