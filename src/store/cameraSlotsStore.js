import { create } from 'zustand'

// Camera slots (I.14.1): saved views of the Plan scene, shown as tiles under
// it. The Room render is taken from a slot's view. Saved in the layout file
// without their thumbnails (I.14.3); not part of undo and redo.

// How many slots there are.
export const SLOT_COUNT = 3

// Display name of a slot by its index: "Camera 1" to "Camera 3".
export const slotName = (index) => `Camera ${index + 1}`

const emptySlots = () => Array.from({ length: SLOT_COUNT }, () => null)

export const useCameraSlotsStore = create((set) => ({
  // One entry per slot: null (empty) or { view, thumbnail }:
  // - view: { position, target, fov }, the 16:9 frame camera when it was saved
  //   (frameView in services/frame.js);
  // - thumbnail: a small JPEG data URL of that view, or null until the Plan
  //   scene draws it (after Open Project, SnapshotBridge).
  slots: emptySlots(),
  // The slot last saved, updated or jumped to, or null.
  activeSlot: null,

  // Saves a view (and its thumbnail) into a slot and makes it active.
  saveSlot: (index, slot) =>
    set((state) => ({ slots: state.slots.map((old, i) => (i === index ? slot : old)), activeSlot: index })),
  // Empties a slot; it is no longer active.
  clearSlot: (index) =>
    set((state) => ({
      slots: state.slots.map((old, i) => (i === index ? null : old)),
      activeSlot: state.activeSlot === index ? null : state.activeSlot,
    })),
  setActiveSlot: (activeSlot) => set({ activeSlot }),
  // A slot's thumbnail, drawn later; the active slot stays.
  setThumbnail: (index, thumbnail) =>
    set((state) => ({
      slots: state.slots.map((old, i) => (i === index && old ? { ...old, thumbnail } : old)),
    })),
  // Open Project: one view (or null) per slot, with no thumbnails yet and no
  // active slot.
  restoreSlots: (views) =>
    set({ slots: views.map((view) => (view ? { view, thumbnail: null } : null)), activeSlot: null }),
  // All slots empty (New Project).
  clearSlots: () => set({ slots: emptySlots(), activeSlot: null }),
}))
