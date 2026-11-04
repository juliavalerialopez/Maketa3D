import { create } from 'zustand'
import { useRoomStore } from './roomStore'
import { clampPosition } from './roomBounds'
import { OBJECT_TYPES } from '../components/objects/catalog'

const PLACEMENT_STEP = 0.3

// The nth new object goes n steps diagonally from the room centre (+x, +z).
// When the next step would cross a wall, it wraps back to the centre.
function placementFor(index, size) {
  const { width, depth } = useRoomStore.getState().room
  const roomX = (width - size.width) / 2
  const roomZ = (depth - size.depth) / 2
  const maxSteps = Math.max(0, Math.floor(Math.min(roomX, roomZ) / PLACEMENT_STEP + 1e-9))
  const step = (index % (maxSteps + 1)) * PLACEMENT_STEP
  return [step, 0, step]
}

// The selected object, or undefined when nothing is selected.
export const selectSelectedObject = (state) =>
  state.objects.find((object) => object.id === state.selectedId)

export const useObjectsStore = create((set) => ({
  objects: [],
  // Last number handed out per type; only grows, so numbers are never reused.
  lastNumbers: {},
  selectedId: null,

  addObject: (type) =>
    set((state) => {
      const entry = OBJECT_TYPES[type]
      const size = { ...entry.size }
      const number = (state.lastNumbers[type] ?? 0) + 1
      // Types with a screen (TV stand) start at the default screen size.
      const extra = entry.screenInches ? { screenInches: entry.screenInches.default } : {}
      return {
        lastNumbers: { ...state.lastNumbers, [type]: number },
        objects: [
          ...state.objects,
          {
            id: crypto.randomUUID(),
            type,
            number,
            position: placementFor(state.objects.length, size),
            rotation: [0, 0, 0],
            size,
            color: entry.color,
            ...extra,
          },
        ],
      }
    }),
  selectObject: (id) => set({ selectedId: id }),
  // Hide switch (H.6.2): a hidden object is left out of the Room render and
  // gets no reference card; in Plan it is drawn faded. Stored only as
  // hidden: true; showing it again removes the flag.
  setHidden: (id, hidden) =>
    set((state) => ({
      objects: state.objects.map((object) => {
        if (object.id !== id) return object
        if (hidden) return { ...object, hidden: true }
        const { hidden: _removed, ...shown } = object
        return shown
      }),
    })),
  updateObject: (id, partial) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, ...partial } : object)),
    })),
  // Moves every object back inside the walls of `room` (I.1: after the room
  // got smaller), with its rotated footprint. An object too big for an axis
  // is centered on it. Objects that already fit stay the same objects. When
  // all fit, the state is returned as is, so no listener is called.
  fitToRoom: (room) =>
    set((state) => {
      let moved = false
      const objects = state.objects.map((object) => {
        const [x, , z] = object.position
        const position = clampPosition(object, room, x, z)
        if (position[0] === x && position[2] === z) return object
        moved = true
        return { ...object, position }
      })
      return moved ? { objects } : state
    }),
  // Replaces all objects (layout import). lastNumbers must be at least each
  // type's highest number, so later objects continue after it.
  replaceObjects: (objects, lastNumbers) => set({ objects, lastNumbers, selectedId: null }),
  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
}))
