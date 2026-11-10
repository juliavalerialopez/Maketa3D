import { tvStandSize } from './tvStandSize.js'

// One entry per placeable object type: plain data only, no React (I.4), so
// stores, the layout file and tests can use it without the 3D models. The
// model of each type is in models.js. Adding a type = a model file, one entry
// here and one line in models.js.
// The Objects section shows one Add button per entry, in this order.
// A type with `screenInches` has a Screen size field: the object stores
// `screenInches` (whole inches, min to max) and its size is sizeFor(inches).
// A type with `front: true` has a front (seat, shelves, screen) that faces
// local +z in its model; the restyle request says which way it faces (I.19).
export const OBJECT_TYPES = {
  sofa: {
    label: 'Sofa',
    size: { width: 2.0, depth: 0.9, height: 0.8 },
    color: '#b5654a',
    front: true,
  },
  coffeeTable: {
    label: 'Coffee table',
    size: { width: 1.0, depth: 0.55, height: 0.4 },
    color: '#8a6a4f',
  },
  armchair: {
    label: 'Armchair',
    size: { width: 0.8, depth: 0.85, height: 0.85 },
    color: '#3d6e52',
    front: true,
  },
  bookshelf: {
    label: 'Bookshelf',
    size: { width: 0.8, depth: 0.3, height: 1.8 },
    color: '#a0785a',
    front: true,
  },
  floorLamp: {
    label: 'Floor lamp',
    size: { width: 0.36, depth: 0.36, height: 1.7 },
    color: '#c9a66b',
  },
  tvStand: {
    label: 'TV stand',
    size: tvStandSize(55),
    color: '#d9d2bf',
    screenInches: { min: 32, max: 85, default: 55 },
    sizeFor: tvStandSize,
    front: true,
  },
}

// Display name of an object, e.g. "Sofa 3".
export function objectLabel(object) {
  return `${OBJECT_TYPES[object.type].label} ${object.number}`
}
