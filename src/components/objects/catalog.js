import Sofa from './Sofa'

// One entry per placeable object type. Adding a type = a model file here + one entry.
export const OBJECT_TYPES = {
  sofa: {
    label: 'Sofa',
    component: Sofa,
    size: { width: 2.0, depth: 0.9, height: 0.8 },
    color: '#b5654a',
  },
}
