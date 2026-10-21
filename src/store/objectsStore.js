import { create } from 'zustand'
import { useRoomStore } from './roomStore'
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
  addObject: (type) =>
    set((state) => {
      const size = { ...OBJECT_TYPES[type].size }
      const number = (state.lastNumbers[type] ?? 0) + 1
      return {
        lastNumbers: { ...state.lastNumbers, [type]: number },
        objects: [
          ...state.objects,
          {
            id: crypto.randomUUID(),
            type,
            number,
            position: placementFor(state.objects.length, size),
            rotation: 0,
            size,
            color: OBJECT_TYPES[type].color,
          },
        ],
      }
    }),

  selectedId: null,
  selectObject: (id) => set({ selectedId: id }),
  updateObject: (id, partial) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, ...partial } : object)),
    })),
  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
}))
