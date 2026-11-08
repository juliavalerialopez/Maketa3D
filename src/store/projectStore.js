import { create } from 'zustand'

// The project's file (I.17): its name, shown next to the logo, and the
// browser's handle to it, so Save writes into it again without asking. Memory
// only; both are null for a new project.
export const NEW_PROJECT_NAME = 'New Project'

// "My Project.json" -> "My Project".
const withoutExtension = (fileName) => fileName.replace(/\.json$/i, '')

export const useProjectStore = create((set) => ({
  // The file name without .json, or null for a new project.
  name: null,
  // A FileSystemFileHandle (services/projectFile.js), or null when there is
  // no file to write into (a new project, or a browser without file access).
  handle: null,

  // After Open, Save or Save As: `fileName` with its extension.
  setFile: (fileName, handle = null) => set({ name: withoutExtension(fileName), handle }),
  // New Project.
  clearFile: () => set({ name: null, handle: null }),
}))

// The name shown in the top bar.
export const selectProjectName = (state) => state.name ?? NEW_PROJECT_NAME
