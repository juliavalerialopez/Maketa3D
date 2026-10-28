import { create } from 'zustand'
import { fetchRemaining, loadPhoto, requestRestyle } from '../services/restyle'
import { useModeStore } from './modeStore'

// Number of the latest request. A new Room render bumps it, so an answer
// for an older render is ignored.
let latestRequest = 0

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

  // A new Room render was taken: the AI image goes back to black so both
  // images always match, and any running request is ignored when it answers.
  clearResult: () => {
    latestRequest++
    set({ status: 'idle', error: null, result: null, resultSnapshot: null })
  },

  generate: async () => {
    const { photo, status, remaining } = get()
    const snapshot = useModeStore.getState().snapshot
    if (!photo || !snapshot || status === 'loading' || remaining === 0) return

    const request = ++latestRequest
    set({ status: 'loading', error: null })
    try {
      const response = await requestRestyle(snapshot, photo.dataUrl)
      if (request !== latestRequest) {
        // Made for an older Room render: drop the image, keep the count.
        if (response.remaining !== null) set({ remaining: response.remaining })
        return
      }
      set((state) => ({
        status: 'idle',
        result: response.image,
        resultSnapshot: snapshot,
        remaining: response.remaining ?? state.remaining,
      }))
    } catch (error) {
      if (request !== latestRequest) {
        if (error.remaining !== undefined) set({ remaining: error.remaining })
        return
      }
      // The previous result, if any, stays.
      set((state) => ({
        status: 'idle',
        error: error.message,
        remaining: error.remaining ?? state.remaining,
      }))
    }
  },
}))
