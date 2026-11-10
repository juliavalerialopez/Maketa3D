import { useEffect, useMemo } from 'react'
import { Html } from '@react-three/drei'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { selectSelectedObject, useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { wallDistances } from '../../store/roomBounds'
import { themeColor } from './themeColor'

// Just above the floor, so the lines do not flicker against it.
const LINE_Y = 0.01
// Sides closer to the wall than this (touching it) get no line or number.
const MIN_DISTANCE = 0.01

// Meters with centimeter precision, e.g. "0.85 m".
const shown = (meters) => `${(Math.round(meters * 100) / 100).toFixed(2)} m`

// For the selected object in Plan: a thin line on the floor from each side of
// its footprint to the wall in that direction, with the distance in meters
// (J0.4). Follows the object while it is dragged. A helper, so it is hidden in
// the Room render; the numbers are HTML over the canvas.
export default function WallDistances() {
  const selected = useObjectsStore(selectSelectedObject)
  const room = useRoomStore((state) => state.room)
  const color = themeColor('--selection', useUiStore((state) => state.theme))

  const sides = useMemo(() => {
    if (!selected) return []
    return Object.values(wallDistances(selected, room)).filter((side) => side.distance >= MIN_DISTANCE)
  }, [selected, room])

  const geometry = useMemo(() => {
    const points = sides.flatMap(({ from, to }) => [from[0], LINE_Y, from[1], to[0], LINE_Y, to[1]])
    const lines = new BufferGeometry()
    lines.setAttribute('position', new Float32BufferAttribute(points, 3))
    return lines
  }, [sides])

  useEffect(() => () => geometry.dispose(), [geometry])

  if (!selected) return null

  return (
    <group userData={{ helper: true }}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} />
      </lineSegments>
      {sides.map(({ from, to, distance }, index) => (
        <Html
          key={index}
          position={[(from[0] + to[0]) / 2, LINE_Y, (from[1] + to[1]) / 2]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="wall-distance">{shown(distance)}</div>
        </Html>
      ))}
    </group>
  )
}
