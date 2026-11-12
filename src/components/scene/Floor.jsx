import { useMemo } from 'react'
import { Shape } from 'three'
import { useRoomStore } from '../../store/roomStore'

import { FLOOR_COLOR } from './roomColors'

// The floor: the room's corners (J.2) as one flat shape, so an L room has an
// L floor. `flat` (Build, J.5) draws it in its plain color, with no light or
// shadow.
export default function Floor({ flat = false }) {
  const corners = useRoomStore((state) => state.room.corners)
  // The shape is drawn in x and y, then laid flat: turning it -90° about x
  // puts its y on -z, so each corner's z goes in as -z.
  const shape = useMemo(() => new Shape(corners.map((corner) => ({ x: corner.x, y: -corner.z }))), [corners])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!flat}>
      <shapeGeometry args={[shape]} />
      {flat ? <meshBasicMaterial color={FLOOR_COLOR} /> : <meshStandardMaterial color={FLOOR_COLOR} />}
    </mesh>
  )
}
