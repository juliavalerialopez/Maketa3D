import { create } from 'zustand'
import { fetchRemaining, loadPhoto, requestRestyle } from '../services/restyle'
import { useModeStore } from './modeStore'

// Number of the latest request. A new Room render bumps it, so an answer
// for an older render is ignored.
let latestRequest = 0

// The parts of a server count to store: the remaining count only when the
// server sent one, and each limit only when known.
function countUpdate(count) {
  if (!count) return {}
  const update = {}
  if (count.remaining !== null) Object.assign(update, { remaining: count.remaining, limit: count.limit })
  if (count.visitorLimit !== null) update.visitorLimit = count.visitorLimit
  if (count.totalLimit !== null) update.totalLimit = count.totalLimit
  return update
}

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
  // Generations this visitor can still make today; null until the server
  // says. At 0, `limit` is the limit reached ('total' | 'visitor').
  remaining: null,
  limit: null,
  // The current daily limits from the server (H.1); null until it says.
  visitorLimit: null,
  totalLimit: null,

  setPhotoFile: async (file) => {
    try {
      set({ photo: await loadPhoto(file), photoError: null })
    } catch (error) {
      set({ photoError: error.message })
    }
  },
  removePhoto: () => set({ photo: null, photoError: null }),

  loadRemaining: async () => set(countUpdate(await fetchRemaining())),

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
      const { image, count } = await requestRestyle(snapshot, photo.dataUrl)
      // Made for an older Room render: drop the image, keep the count.
      if (request !== latestRequest) return set(countUpdate(count))
      set({ status: 'idle', result: image, resultSnapshot: snapshot, ...countUpdate(count) })
    } catch (error) {
      if (request !== latestRequest) return set(countUpdate(error.count))
      // The previous result, if any, stays.
      set({ status: 'idle', error: error.message, ...countUpdate(error.count) })
    }
  },
}))
