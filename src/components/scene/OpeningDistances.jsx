import { useEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { openingGaps, openingsOf } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { showWallFor } from './wallVisibility'
import { openingPlacement } from './openingPlacement'
import { themeColor } from './themeColor'
import { meters } from './buildText'

// Gaps smaller than this (touching) get no line or number.
const MIN_GAP = 0.01
// How far in front of the wall the lines are: on the wall in 3D, inside the
// room in 2D so they show next to the wall from above.
const IN_FRONT_3D = 0.02
const IN_FRONT_2D = 0.2
// In 2D, where the floor and ceiling numbers sit, farther into the room.
const HEIGHTS_LABEL_2D = 0.3

// The lines and numbers for the selected opening, in its own frame: x along
// the wall, y up, its middle at the origin. Lines: { from: [x, y], to, text }.
// In 2D the floor and ceiling are one label (`heights`), as their lines would
// point straight at the camera.
function measure(room, id, topView) {
  const opening = openingsOf(room).find((item) => item.id === id)
  const wall = opening && roomWalls(room.corners)[opening.wallIndex]
  if (!wall) return null
  const gaps = openingGaps(room, opening)
  const { position, turn } = openingPlacement(wall, opening, topView ? IN_FRONT_2D : IN_FRONT_3D)
  // Which way along the wall local +x points: toward its last corner (1) or its first (-1).
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const side = Math.cos(turn) * dx - Math.sin(turn) * dz >= 0 ? 1 : -1
  const [halfWidth, halfHeight] = [opening.width / 2, opening.height / 2]
  const lines = []
  const add = (gap, from, to) => gap >= MIN_GAP && lines.push({ from, to, text: meters(gap) })
  add(gaps.before, [-side * halfWidth, 0], [-side * (halfWidth + gaps.before), 0])
  add(gaps.after, [side * halfWidth, 0], [side * (halfWidth + gaps.after), 0])
  let heights = null
  if (topView) {
    const parts = []
    if (gaps.floor >= MIN_GAP) parts.push(`Floor ${meters(gaps.floor)}`)
    if (gaps.ceiling >= MIN_GAP) parts.push(`Ceiling ${meters(gaps.ceiling)}`)
    heights = parts.length ? parts.join(' · ') : null
  } else {
    add(gaps.floor, [0, -halfHeight], [0, -halfHeight - gaps.floor])
    add(gaps.ceiling, [0, halfHeight], [0, halfHeight + gaps.ceiling])
  }
  return { position, turn, normal: wall.normal, lines, heights }
}

// For the selected door or window in Plan (J.9.2), as for furniture (J0.4):
// thin lines from each of its edges to the nearest wall along it, to the
// floor and to the ceiling, with the distance in meters. Follows it while it
// moves. A helper, so it is hidden in the Room render; it hides with its wall
// when the camera is outside it. The numbers are HTML over the canvas.
export default function OpeningDistances({ fromAbove = false }) {
  const room = useRoomStore((state) => state.room)
  const selectedId = useUiStore((state) => state.selectedOpening)
  // Plan's 2D view, or Build (`fromAbove`), which always looks from above.
  const topView = useUiStore((state) => state.sceneView === '2d') || fromAbove
  const color = themeColor('--selection', useUiStore((state) => state.theme))
  const groupRef = useRef(null)
  const labelRefs = useRef([])

  const shown = useMemo(() => measure(room, selectedId, topView), [room, selectedId, topView])

  const geometry = useMemo(() => {
    const points = (shown?.lines ?? []).flatMap(({ from, to }) => [from[0], from[1], 0, to[0], to[1], 0])
    const lines = new BufferGeometry()
    lines.setAttribute('position', new Float32BufferAttribute(points, 3))
    return lines
  }, [shown])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ camera }) => {
    const group = groupRef.current
    if (!group) return
    showWallFor(group, camera)
    // HTML does not hide with the group by itself.
    for (const label of labelRefs.current) if (label) label.style.visibility = group.visible ? '' : 'hidden'
  })

  if (!shown) return null
  const { position, turn, normal, lines, heights } = shown
  return (
    // The helper flag on its own group: the Room render shows or hides
    // whatever has a wallNormal after hiding helpers, which must not show this.
    <group userData={{ helper: true }}>
      <group ref={groupRef} position={position} rotation={[0, turn, 0]} userData={{ wallNormal: [normal[0], 0, normal[1]] }}>
        <lineSegments geometry={geometry}>
          <lineBasicMaterial color={color} />
        </lineSegments>
        {lines.map(({ from, to, text }, index) => (
          <Html
            key={index}
            position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div ref={(label) => (labelRefs.current[index] = label)} className="wall-distance">
              {text}
            </div>
          </Html>
        ))}
        {heights && (
          <Html position={[0, 0, HEIGHTS_LABEL_2D]} center style={{ pointerEvents: 'none' }}>
            <div ref={(label) => (labelRefs.current[lines.length] = label)} className="wall-distance">
              {heights}
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}
