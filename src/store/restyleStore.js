import { create } from 'zustand'
import { fetchRemaining, loadPhoto, requestRestyle } from '../services/restyle'
import { useModeStore } from './modeStore'
import { useObjectsStore } from './objectsStore'

// Key of the Reference Room card in `references` (object cards use the object id).
export const ROOM_REFERENCE = 'room'

// What a card has before it is touched: Reference mode, no photo.
export const DEFAULT_REFERENCE = { mode: 'reference', photo: null, photoError: null }

// Most versions kept at once; at this many, Generate is blocked (H.2).
export const MAX_VERSIONS = 6

// Number of the latest request. clearVersions bumps it, so an answer that
// arrives after the versions were cleared is dropped.
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

// references with one card changed (missing cards start from the default).
function withReference(references, key, update) {
  return { ...references, [key]: { ...DEFAULT_REFERENCE, ...references[key], ...update } }
}

// True for the room card and for objects that still exist.
function referenceKeyExists(key) {
  return key === ROOM_REFERENCE || useObjectsStore.getState().objects.some((object) => object.id === key)
}

// AI restyle state (Part F, H.2), memory only: kept across mode switches,
// lost on reload. generate() runs here, not in a component, so a request keeps going
// when Personalize unmounts.
export const useRestyleStore = create((set, get) => ({
  // Reference photo, resized once on upload: { dataUrl, name } or null.
  photo: null,
  photoError: null,
  // One reference per card (H.5), by object id or ROOM_REFERENCE:
  // { mode: 'reference' | 'creative', photo: { dataUrl, name } | null,
  //   photoError: string | null }. A missing key means DEFAULT_REFERENCE.
  references: {},
  status: 'idle', // 'idle' | 'loading'
  error: null,
  // Generated images, oldest first, at most MAX_VERSIONS:
  // { id, number, image, roomRender, createdAt }. image and roomRender are
  // data URLs (roomRender is the Room render it was made from); number counts
  // up per session and is never reused (download names).
  versions: [],
  selectedVersionId: null,
  lastVersionNumber: 0,
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

  setReferenceMode: (key, mode) =>
    set((state) => ({ references: withReference(state.references, key, { mode }) })),
  // Checks and resizes the photo (Part F checks), then stores it, unless the
  // object was deleted while the photo loaded.
  setReferencePhotoFile: async (key, file) => {
    let update
    try {
      update = { photo: await loadPhoto(file), photoError: null }
    } catch (error) {
      update = { photoError: error.message }
    }
    if (!referenceKeyExists(key)) return
    set((state) => ({ references: withReference(state.references, key, update) }))
  },
  removeReferencePhoto: (key) =>
    set((state) => ({ references: withReference(state.references, key, { photo: null, photoError: null }) })),

  loadRemaining: async () => set(countUpdate(await fetchRemaining())),

  selectVersion: (id) => set({ selectedVersionId: id }),

  // Deletes one version, no confirmation. If it was the selected one, the
  // next is selected (or the previous one if it was last); none left: black.
  deleteVersion: (id) =>
    set((state) => {
      const index = state.versions.findIndex((version) => version.id === id)
      if (index === -1) return {}
      const versions = state.versions.filter((version) => version.id !== id)
      if (state.selectedVersionId !== id) return { versions }
      const neighbor = versions[index] ?? versions[index - 1]
      return { versions, selectedVersionId: neighbor?.id ?? null }
    }),

  // Leaving Personalize (after the confirmation) or a new Room render: all
  // versions go, the AI image is black again, and a running request is
  // dropped when it answers (its count is still kept).
  clearVersions: () => {
    latestRequest++
    set({ status: 'idle', error: null, versions: [], selectedVersionId: null })
  },

  generate: async () => {
    const { photo, status, remaining, versions } = get()
    const snapshot = useModeStore.getState().snapshot
    if (!photo || !snapshot || status === 'loading' || remaining === 0) return
    if (versions.length >= MAX_VERSIONS) return

    const request = ++latestRequest
    set({ status: 'loading', error: null })
    try {
      const { image, count } = await requestRestyle(snapshot, photo.dataUrl)
      // The versions were cleared meanwhile: drop the image, keep the count.
      if (request !== latestRequest) return set(countUpdate(count))
      // The new version goes at the end and is shown.
      set((state) => {
        const version = {
          id: crypto.randomUUID(),
          number: state.lastVersionNumber + 1,
          image,
          roomRender: snapshot,
          createdAt: Date.now(),
        }
        return {
          status: 'idle',
          versions: [...state.versions, version],
          selectedVersionId: version.id,
          lastVersionNumber: version.number,
          ...countUpdate(count),
        }
      })
    } catch (error) {
      if (request !== latestRequest) return set(countUpdate(error.count))
      // The versions stay as they were.
      set({ status: 'idle', error: error.message, ...countUpdate(error.count) })
    }
  },
}))

// The version shown in the AI image, or undefined when none is selected.
export const selectSelectedVersion = (state) =>
  state.versions.find((version) => version.id === state.selectedVersionId)

// A card's reference: its stored value, or the default when untouched.
export const selectReference = (key) => (state) => state.references[key] ?? DEFAULT_REFERENCE

// A deleted object (Delete, New Project, Open Project) loses its card and its
// photo: references for ids that no longer exist are dropped.
useObjectsStore.subscribe((state, previous) => {
  if (state.objects === previous.objects) return
  const ids = new Set(state.objects.map((object) => object.id))
  const { references } = useRestyleStore.getState()
  const stale = Object.keys(references).filter((key) => key !== ROOM_REFERENCE && !ids.has(key))
  if (stale.length === 0) return
  const kept = { ...references }
  stale.forEach((key) => delete kept[key])
  useRestyleStore.setState({ references: kept })
})
