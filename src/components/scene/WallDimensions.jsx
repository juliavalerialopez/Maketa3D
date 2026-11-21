import { useEffect, useMemo } from 'react'
import { Html } from '@react-three/drei'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { roomWalls } from '../../store/roomShape'
import { themeColor } from './themeColor'
import { wallDimensionsFor } from './dimensionLines'

// Just above the floor, flat.
const LINE_Y = 0.03

// The walls' lengths as dimension lines (J.5.3), like Plan's: a line
// parallel to each wall, `offset` meters outside it, with a tick at each end
// and the length in the middle. Replaces the plain number next to each wall
// (J.5.1). The numbers let clicks through to the view.
export default function WallDimensions({ offset }) {
  const corners = useRoomStore((state) => state.room.corners)
  const color = themeColor('--muted', useUiStore((state) => state.theme))
  const { lines, labels } = useMemo(() => wallDimensionsFor(roomWalls(corners), offset), [corners, offset])

  const geometry = useMemo(() => {
    const points = lines.flatMap(([x1, z1, x2, z2]) => [x1, LINE_Y, z1, x2, LINE_Y, z2])
    const segments = new BufferGeometry()
    segments.setAttribute('position', new Float32BufferAttribute(points, 3))
    return segments
  }, [lines])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} />
      </lineSegments>
      {labels.map(({ x, z, text }, index) => (
        <Html key={index} position={[x, LINE_Y, z]} center style={{ pointerEvents: 'none' }}>
          <div className="dimension-label">{text}</div>
        </Html>
      ))}
    </>
  )
}
