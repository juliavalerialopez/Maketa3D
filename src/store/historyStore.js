import { create } from 'zustand'
import { useRoomStore } from './roomStore.js'
import { useObjectsStore } from './objectsStore.js'
import { CAMERA_ID, useCameraStore } from './cameraStore.js'

// Undo and redo (I.11) for the room size, the objects and the placeable
// camera (I.14). A step is a snapshot { room, objects, camera } of how things
// were before a change. Selection, mode and the Plan view are not part of it. Object numbers are never reused, so an
// undone Add does not give its number back. Memory only.
const MAX_STEPS = 50

// How things were when the first open gesture started, or null, and how many
// gestures are open. While any gesture is open (a drag, editing one field, one
// color pick), changes are not recorded one by one: when the last one ends,
// one step is recorded for all of them. Gestures can overlap (a field still
// focused while a 3D drag starts), so each one is counted.
let gestureStart = null
let openGestures = 0
// True while undo or redo writes the stores, so that is not recorded.
let restoring = false

const current = () => ({
  room: useRoomStore.getState().room,
  objects: useObjectsStore.getState().objects,
  camera: useCameraStore.getState().camera,
})
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b)
const sameSnapshot = (a, b) => same(a.room, b.room) && same(a.objects, b.objects) && same(a.camera, b.camera)

// Writes a snapshot to the stores. The selection is cleared if the selected
// object is not in it.
function apply(snapshot) {
  restoring = true
  try {
    useRoomStore.setState({ room: snapshot.room })
    useCameraStore.setState({ camera: snapshot.camera })
    useObjectsStore.setState((state) => ({
      objects: snapshot.objects,
      // The camera (I.14) is always there, so it stays selected.
      selectedId:
        state.selectedId === CAMERA_ID || snapshot.objects.some((object) => object.id === state.selectedId)
          ? state.selectedId
          : null,
    }))
  } finally {
    restoring = false
  }
}

export const useHistoryStore = create((set, get) => ({
  // Steps to undo, oldest first, and steps to redo, the next one last.
  past: [],
  future: [],

  // Records `snapshot` as one undo step. A new change clears the redo steps.
  record: (snapshot) =>
    set((state) => ({ past: [...state.past, snapshot].slice(-MAX_STEPS), future: [] })),

  // Undo and redo wait while a gesture is in progress (e.g. Ctrl+Z during a
  // drag): the drag would go on and record every later move on its own.
  undo: () => {
    if (gestureStart) return
    const { past, future } = get()
    if (past.length === 0) return
    const now = current()
    apply(past.at(-1))
    set({ past: past.slice(0, -1), future: [...future, now] })
  },

  redo: () => {
    if (gestureStart) return
    const { past, future } = get()
    if (future.length === 0) return
    const now = current()
    apply(future.at(-1))
    set({ past: [...past, now].slice(-MAX_STEPS), future: future.slice(0, -1) })
  },

  // New Project and Open Project start without history.
  // Open gestures stay open; what they change becomes the first new step.
  clear: () => {
    if (gestureStart) gestureStart = current()
    set({ past: [], future: [] })
  },
}))

// Starts a gesture: everything until its endGesture is one undo step. Each
// beginGesture needs exactly one endGesture, also when the gesture is cut
// short (pointer cancel, unmount), or undo stays blocked.
export function beginGesture() {
  if (openGestures === 0) gestureStart = current()
  openGestures++
}

// Ends one gesture. When it was the last open one, records the step if
// anything changed.
export function endGesture() {
  if (openGestures === 0) return
  openGestures--
  if (openGestures > 0) return
  const start = gestureStart
  gestureStart = null
  if (!sameSnapshot(start, current())) useHistoryStore.getState().record(start)
}

// Props for a NumberField or ColorField: editing one field is one step.
export const editGesture = { onEditStart: beginGesture, onEditEnd: endGesture }

export const selectCanUndo = (state) => state.past.length > 0
export const selectCanRedo = (state) => state.future.length > 0

// Changes outside a gesture (Add, Delete, Hide, a step button) are one step
// each: the state before the change is recorded.
useRoomStore.subscribe((state, previous) => {
  if (restoring || gestureStart || state.room === previous.room) return
  useHistoryStore.getState().record({ ...current(), room: previous.room })
})
useObjectsStore.subscribe((state, previous) => {
  if (restoring || gestureStart || state.objects === previous.objects) return
  useHistoryStore.getState().record({ ...current(), objects: previous.objects })
})
useCameraStore.subscribe((state, previous) => {
  if (restoring || gestureStart || state.camera === previous.camera) return
  useHistoryStore.getState().record({ ...current(), camera: previous.camera })
})
