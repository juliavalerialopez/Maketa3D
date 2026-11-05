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
  // The placeable camera's live preview in Plan (I.14).
  previewVisible: true,

  setPlanPercent: (planPercent) => set({ planPercent }),
  setPersonalizePercent: (personalizePercent) => set({ personalizePercent }),
  setSectionOpen: (id, open) =>
    set((state) => ({ openSections: { ...state.openSections, [id]: open } })),
  togglePreview: () => set((state) => ({ previewVisible: !state.previewVisible })),
}))

// Without a manual choice, follow the system setting when it changes.
systemDark.addEventListener('change', (event) => {
  const saved = savedTheme()
  if (saved === 'light' || saved === 'dark') return
  const theme = event.matches ? 'dark' : 'light'
  root.dataset.theme = theme
  useUiStore.setState({ theme })
})
