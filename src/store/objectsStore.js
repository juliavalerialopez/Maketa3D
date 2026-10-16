import { create } from 'zustand'

const DEFAULTS = {
  sofa: { size: { width: 2.0, depth: 0.9, height: 0.8 }, color: '#b5654a' },
}

export const useObjectsStore = create((set) => ({
  objects: [],
  addObject: (type) =>
    set((state) => ({
      objects: [
        ...state.objects,
        {
          id: crypto.randomUUID(),
          type,
          position: [0, 0, 0],
          rotation: 0,
          size: { ...DEFAULTS[type].size },
          color: DEFAULTS[type].color,
        },
      ],
    })),
}))
