import { create } from 'zustand'
import { fetchRemaining, loadPhoto, requestRestyle } from '../services/restyle'
import { useModeStore } from './modeStore'

// AI restyle state (Part F), memory only: kept across mode switches, lost on
// reload. generate() runs here, not in a component, so a request keeps going
// when Personalize unmounts.
export const useRestyleStore = create((set, get) => ({
  // Reference photo, resized once on upload: { dataUrl, name } or null.
  photo: null,
  photoError: null,
  status: 'idle', // 'idle' | 'loading'
  error: null,
  // AI image (data URL) and the Room render it was made from.
  result: null,
  resultSnapshot: null,
  // Generations this visitor can still make today; null until the server says.
  remaining: null,

  setPhotoFile: async (file) => {
    try {
      set({ photo: await loadPhoto(file), photoError: null })
    } catch (error) {
      set({ photoError: error.message })
    }
  },
  removePhoto: () => set({ photo: null, photoError: null }),

  loadRemaining: async () => {
    const remaining = await fetchRemaining()
    if (remaining !== null) set({ remaining })
  },

  generate: async () => {
    const { photo, status, remaining } = get()
    const snapshot = useModeStore.getState().snapshot
    if (!photo || !snapshot || status === 'loading' || remaining === 0) return

    set({ status: 'loading', error: null })
    try {
      const response = await requestRestyle(snapshot, photo.dataUrl)
      set((state) => ({
        status: 'idle',
        result: response.image,
        resultSnapshot: snapshot,
        remaining: response.remaining ?? state.remaining,
      }))
    } catch (error) {
      // The previous result, if any, stays.
      set((state) => ({
        status: 'idle',
        error: error.message,
        remaining: error.remaining ?? state.remaining,
      }))
    }
  },
}))
