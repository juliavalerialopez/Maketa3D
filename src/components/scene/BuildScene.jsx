import { useState } from 'react'
import { Html } from '@react-three/drei'
import { ROOM_LIMITS, useRoomStore } from '../../store/roomStore'
import { MIN_WALL } from '../../store/roomShape'
import { editGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'
import Floor from './Floor'
import { wallBoxes } from './wallBoxes'

// Build draws the walls flat and dark, thicker than in 3D so they read from
// above. Outward from the inside edge, so the room's inside size is the same.
const BUILD_WALL_THICKNESS = 0.12
const BUILD_WALL_COLOR = '#4a463f'
// Just above the floor, flat.
const WALL_DRAW_HEIGHT = 0.02
// How far outside a wall its length sits, in meters.
const LABEL_GAP = 0.45

// A wall's inside length, at its middle just outside the room. Typing a
// length (or stepping it) moves the wall's end farther from the origin; a
// length that would break the room (a wall under 0.5 m, crossing walls, a
// room too big or too small) is refused and the field shows the length
// again.
function WallLength({ index, wall }) {
  // The length being typed or stepped, until it is final; null otherwise.
  const [typed, setTyped] = useState(null)
  const [refusals, setRefusals] = useState(0)
  const [mx, mz] = [(wall.start.x + wall.end.x) / 2, (wall.start.z + wall.end.z) / 2]
  const gap = BUILD_WALL_THICKNESS + LABEL_GAP

  // Applied only once final (blur, a step, the end of a drag), since every
  // length in between may not make a room.
  function commit(length) {
    setTyped(null)
    if (Math.abs(length - wall.length) < 1e-9) return
    if (!useRoomStore.getState().setWallLength(index, length)) setRefusals((count) => count + 1)
  }

  return (
    <Html position={[mx + wall.normal[0] * gap, 0, mz + wall.normal[1] * gap]} center>
      <div className="wall-length">
        {/* Remounted after a refusal, so it shows the stored length again. */}
        <NumberField
          key={refusals}
          compact
          label={`Wall ${index + 1}`}
          value={typed ?? wall.length}
          onChange={setTyped}
          onCommit={commit}
          {...editGesture}
          min={MIN_WALL}
          max={ROOM_LIMITS.width[1]}
          unit="m"
        />
      </div>
    </Html>
  )
}

// The Build view (J.5): the room from above, flat, with no light or shadow:
// the floor in its color, the walls dark, each wall's length next to it.
// Furniture is not shown.
export default function BuildScene() {
  const { corners } = useRoomStore((state) => state.room)
  const walls = wallBoxes(corners, WALL_DRAW_HEIGHT, BUILD_WALL_THICKNESS)

  return (
    <>
      <Floor flat />
      {walls.map((box, index) => (
        <mesh key={index} position={box.position}>
          <boxGeometry args={box.size} />
          <meshBasicMaterial color={BUILD_WALL_COLOR} />
        </mesh>
      ))}
      {walls.map((box, index) => (
        <WallLength key={index} index={index} wall={box.wall} />
      ))}
    </>
  )
}
