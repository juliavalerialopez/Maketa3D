import { useMemo } from 'react'
import { Shape } from 'three'
import { useRoomStore } from '../../store/roomStore'

// Warm sand from the soft UI palette. The same in both themes, so the Room
// render sent to the AI does not depend on the theme.
const FLOOR_COLOR = '#d9d1bb'

// The floor: the room's corners (J.2) as one flat shape, so an L room has an
// L floor.
export default function Floor() {
  const corners = useRoomStore((state) => state.room.corners)
  // The shape is drawn in x and y, then laid flat: turning it -90° about x
  // puts its y on -z, so each corner's z goes in as -z.
  const shape = useMemo(() => new Shape(corners.map((corner) => ({ x: corner.x, y: -corner.z }))), [corners])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={FLOOR_COLOR} />
    </mesh>
  )
}
