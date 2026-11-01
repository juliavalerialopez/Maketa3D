import Sofa from './Sofa'
import CoffeeTable from './CoffeeTable'

// One entry per placeable object type. Adding a type = a model file here + one entry.
// The Objects section shows one Add button per entry, in this order.
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
}

// Display name of an object, e.g. "Sofa 3".
export function objectLabel(object) {
  return `${OBJECT_TYPES[object.type].label} ${object.number}`
}
