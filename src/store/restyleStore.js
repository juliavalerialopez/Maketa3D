import { create } from 'zustand'
import { fetchRemaining, loadPhoto, MAX_PHOTOS, requestRestyle } from '../services/restyle'
import { useModeStore } from './modeStore'
import { useObjectsStore } from './objectsStore'
import { objectLabel } from '../components/objects/catalog'

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

// Where an object shows in the current Room render ({ x, y, inFrame }), or
// undefined if the render has no position for it.
function framePositionOf(id) {
  return useModeStore.getState().snapshotObjects.find((item) => item.id === id)
}

// True when the object is not in the Room render's frame: it is not sent.
export function isOutOfFrame(id) {
  return framePositionOf(id)?.inFrame === false
}

// The cards that are sent, in panel order: the room, then the objects in
// list order that are inside the Room render's frame.
function sentKeys() {
  const ids = useObjectsStore.getState().objects.map((object) => object.id)
  return [ROOM_REFERENCE, ...ids.filter((id) => !isOutOfFrame(id))]
}

const hasPhoto = (reference) => reference?.mode === 'reference' && Boolean(reference.photo)

// The references as they are sent (H.7): a Reference card with no photo
// becomes Creative, and past MAX_PHOTOS photos the later objects become
// Creative too. Returns { references, capped } (capped: how many objects
// were switched for the limit).
function referencesToSend(references) {
  const next = { ...references }
  let photos = 0
  let capped = 0
  for (const key of sentKeys()) {
    const reference = { ...DEFAULT_REFERENCE, ...references[key] }
    if (reference.mode !== 'reference') continue
    if (!reference.photo) {
      next[key] = { ...reference, mode: 'creative' }
    } else if (photos === MAX_PHOTOS) {
      next[key] = { ...reference, mode: 'creative' }
      capped++
    } else {
      photos++
    }
  }
  return { references: next, capped }
}

// The notice after the limit switched some objects to Creative.
function cappedNotice(capped) {
  if (capped === 0) return null
  const what = capped === 1 ? '1 object was' : `${capped} objects were`
  return `${what} switched to Creative: at most ${MAX_PHOTOS} photos per image.`
}

// The request content for the sent cards (see requestRestyle).
function requestContent(references) {
  const card = (key) => {
    const { mode, photo } = references[key] ?? DEFAULT_REFERENCE
    return mode === 'reference' && photo ? { mode, photo: photo.dataUrl } : { mode: 'creative' }
  }
  const sent = new Set(sentKeys())
  const objects = useObjectsStore
    .getState()
    .objects.filter((object) => sent.has(object.id))
    .map((object) => {
      const { x, y } = framePositionOf(object.id) ?? { x: 50, y: 50 }
      return { id: object.id, type: object.type, name: objectLabel(object), x, y, ...card(object.id) }
    })
  return { room: card(ROOM_REFERENCE), objects }
}

// AI restyle state (Part F, H.2), memory only: kept across mode switches,
// lost on reload. generate() runs here, not in a component, so a request keeps going
// when Personalize unmounts.
export const useRestyleStore = create((set, get) => ({
  // One reference per card (H.5), by object id or ROOM_REFERENCE:
  // { mode: 'reference' | 'creative', photo: { dataUrl, name } | null,
  //   photoError: string | null }. A missing key means DEFAULT_REFERENCE.
  references: {},
  // Shown under the Reference title after Generate switched objects to
  // Creative for the photo limit; null otherwise.
  notice: null,
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
  // Clear All: every photo goes (the room's too); the modes stay.
  clearReferencePhotos: () =>
    set((state) => ({
      references: Object.fromEntries(
        Object.entries(state.references).map(([key, reference]) => [
          key,
          { ...reference, photo: null, photoError: null },
        ]),
      ),
    })),

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
    const { status, remaining, versions } = get()
    const snapshot = useModeStore.getState().snapshot
    // At least one photo, on a card that is sent (H.6.1).
    if (selectPhotoCount(get()) === 0 || !snapshot || status === 'loading' || remaining === 0) return
    if (versions.length >= MAX_VERSIONS) return

    // Empty Reference cards and photos past the limit become Creative; the
    // cards show it.
    const { references, capped } = referencesToSend(get().references)
    const request = ++latestRequest
    set({ references, notice: cappedNotice(capped), status: 'loading', error: null })
    try {
      const { image, count } = await requestRestyle({ snapshot, ...requestContent(references) })
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

// Number of sent cards (the room, objects in the frame) with a photo in
// Reference mode. Generate needs at least one (H.6.1).
export const selectPhotoCount = (state) => sentKeys().filter((key) => hasPhoto(state.references[key])).length

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
