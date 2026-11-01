import Sofa from './Sofa'
import CoffeeTable from './CoffeeTable'
import Armchair from './Armchair'
import Bookshelf from './Bookshelf'
import FloorLamp from './FloorLamp'
import TvStand from './TvStand'
import { tvStandSize } from './tvStandSize'

// One entry per placeable object type. Adding a type = a model file here + one entry.
// The Objects section shows one Add button per entry, in this order.
// A type with `screenInches` has a Screen size field: the object stores
// `screenInches` (whole inches, min to max) and its size is sizeFor(inches).
export const OBJECT_TYPES = {
  sofa: {
    label: 'Sofa',
    component: Sofa,
    size: { width: 2.0, depth: 0.9, height: 0.8 },
    color: '#b5654a',
  },
  coffeeTable: {
    label: 'Coffee table',
    component: CoffeeTable,
    size: { width: 1.0, depth: 0.55, height: 0.4 },
    color: '#8a6a4f',
  },
  armchair: {
    label: 'Armchair',
    component: Armchair,
    size: { width: 0.8, depth: 0.85, height: 0.85 },
    color: '#3d6e52',
  },
  bookshelf: {
    label: 'Bookshelf',
    component: Bookshelf,
    size: { width: 0.8, depth: 0.3, height: 1.8 },
    color: '#a0785a',
  },
  floorLamp: {
    label: 'Floor lamp',
    component: FloorLamp,
    size: { width: 0.36, depth: 0.36, height: 1.7 },
    color: '#c9a66b',
  },
  tvStand: {
    label: 'TV stand',
    component: TvStand,
    size: tvStandSize(55),
    color: '#d9d2bf',
    screenInches: { min: 32, max: 85, default: 55 },
    sizeFor: tvStandSize,
  },
}

// Display name of an object, e.g. "Sofa 3".
export function objectLabel(object) {
  return `${OBJECT_TYPES[object.type].label} ${object.number}`
}
