import { create } from 'zustand'
import { useRoomStore } from './roomStore.js'
import { clampPosition } from './roomBounds.js'
import { boundingBox } from './roomShape.js'
import { OBJECT_TYPES } from '../components/objects/catalog.js'

const PLACEMENT_STEP = 0.3
// How far to the side a duplicate goes (J0.6).
const DUPLICATE_OFFSET = 0.3

// The nth new object goes n steps diagonally from the middle of the room's
// bounding box (+x, +z). When the next step would cross a wall, it wraps back
// to the middle. In an L room a spot out of the room (the cut away corner)
// is moved inside.
function placementFor(index, size) {
  const { room } = useRoomStore.getState()
  const box = boundingBox(room.corners)
  const roomX = (box.width - size.width) / 2
  const roomZ = (box.depth - size.depth) / 2
  const maxSteps = Math.max(0, Math.floor(Math.min(roomX, roomZ) / PLACEMENT_STEP + 1e-9))
  const step = (index % (maxSteps + 1)) * PLACEMENT_STEP
  return clampPosition({ size, rotation: [0, 0, 0] }, room, box.centerX + step, box.centerZ + step)
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
  // A copy of object `id` (J0.6): same type, size, turn, color and screen
  // size, with its own id and the next number of its type, 0.3 m to the right
  // (to the left when the right wall is in the way), inside the walls, and
  // selected. Shown even when the original is hidden. One change, so one undo
  // step.
  duplicateObject: (id) =>
    set((state) => {
      const source = state.objects.find((object) => object.id === id)
      if (!source) return state
      const { hidden: _hidden, ...copy } = source
      const { room } = useRoomStore.getState()
      const [x, , z] = source.position
      let position = clampPosition(source, room, x + DUPLICATE_OFFSET, z)
      if (position[0] === x) position = clampPosition(source, room, x - DUPLICATE_OFFSET, z)
      const number = (state.lastNumbers[source.type] ?? 0) + 1
      const duplicate = { ...copy, id: crypto.randomUUID(), number, position }
      return {
        lastNumbers: { ...state.lastNumbers, [source.type]: number },
        objects: [...state.objects, duplicate],
        selectedId: duplicate.id,
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
