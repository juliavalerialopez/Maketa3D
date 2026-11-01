import Parts from './Parts'

const TOP_THICKNESS = 0.04
const LEG = 0.05 // square leg, side length
const LEG_INSET = 0.03 // from the table edge

// A top slab and four legs, filling its size bounds exactly. Drawn at the
// origin, standing on y = 0; the scene places and rotates it.
export default function CoffeeTable({ size, color }) {
  const { width, depth, height } = size
  const legHeight = height - TOP_THICKNESS
  const legX = width / 2 - LEG_INSET - LEG / 2
  const legZ = depth / 2 - LEG_INSET - LEG / 2

  const parts = [
    { position: [0, height - TOP_THICKNESS / 2, 0], box: [width, TOP_THICKNESS, depth] },
    ...[
      [-legX, -legZ],
      [legX, -legZ],
      [-legX, legZ],
      [legX, legZ],
    ].map(([x, z]) => ({ position: [x, legHeight / 2, z], box: [LEG, legHeight, LEG] })),
  ]

  return <Parts parts={parts} color={color} />
}
