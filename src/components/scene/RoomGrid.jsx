import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { gridFor } from './gridPoints'

// Visible on the floor (#d9d1bb) without a strong contrast; same in both themes.
const DOT_COLOR = '#a99f84'
const LINE_COLOR = '#bcb399'
const DOT_PIXELS = 2
const GRID_Y = 0.01

export default function RoomGrid() {
  const corners = useRoomStore((state) => state.room.corners)
  const { dotGeometry, lineGeometry } = useMemo(() => {
    const { dots, lines } = gridFor(corners)
    const dotGeometry = new BufferGeometry()
    dotGeometry.setAttribute('position', new Float32BufferAttribute(dots.flatMap(([x, z]) => [x, GRID_Y, z]), 3))
    const lineGeometry = new BufferGeometry()
    lineGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(lines.flatMap(([x1, z1, x2, z2]) => [x1, GRID_Y, z1, x2, GRID_Y, z2]), 3),
    )
    return { dotGeometry, lineGeometry }
  }, [corners])

  useEffect(
    () => () => {
      dotGeometry.dispose()
      lineGeometry.dispose()
    },
    [dotGeometry, lineGeometry],
  )

  // Drawn over the floor without a depth test, so it never fades into it.
  return (
    <>
      <lineSegments geometry={lineGeometry} renderOrder={1}>
        <lineBasicMaterial color={LINE_COLOR} transparent depthTest={false} depthWrite={false} />
      </lineSegments>
      <points geometry={dotGeometry} renderOrder={1}>
        <pointsMaterial
          color={DOT_COLOR}
          size={DOT_PIXELS}
          sizeAttenuation={false}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </points>
    </>
  )
}
