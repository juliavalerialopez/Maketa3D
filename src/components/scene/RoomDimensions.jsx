import { useEffect, useMemo } from 'react'
import { Html } from '@react-three/drei'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { themeColor } from './themeColor'
import { dimensionsFor } from './dimensionLines'

// Just above the floor, flat.
const LINE_Y = 0.03

// The room's sizes (J.5.3): dimension lines along its back and left side with
// the lengths, and its area in the middle of the floor. `gap` is how far the
// first line sits outside the room. Build passes `withLines` false: it writes
// each wall's length next to the wall already, so only the area shows there.
// A helper, so it is hidden in a Room render; the
// numbers are HTML over the canvas, which lets clicks through.
export default function RoomDimensions({ gap, withLines = true }) {
  const corners = useRoomStore((state) => state.room.corners)
  const color = themeColor('--muted', useUiStore((state) => state.theme))
  const { lines, labels, area } = useMemo(() => dimensionsFor(corners, gap), [corners, gap])

  const geometry = useMemo(() => {
    const points = lines.flatMap(([x1, z1, x2, z2]) => [x1, LINE_Y, z1, x2, LINE_Y, z2])
    const segments = new BufferGeometry()
    segments.setAttribute('position', new Float32BufferAttribute(points, 3))
    return segments
  }, [lines])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group userData={{ helper: true }}>
      {withLines && (
        <lineSegments geometry={geometry}>
          <lineBasicMaterial color={color} />
        </lineSegments>
      )}
      {withLines &&
        labels.map(({ x, z, text }, index) => (
          <Html key={index} position={[x, LINE_Y, z]} center style={{ pointerEvents: 'none' }}>
            <div className="dimension-label">{text}</div>
          </Html>
        ))}
      <Html position={[area.x, LINE_Y, area.z]} center style={{ pointerEvents: 'none' }}>
        <div className="room-area">{area.text}</div>
      </Html>
    </group>
  )
}
