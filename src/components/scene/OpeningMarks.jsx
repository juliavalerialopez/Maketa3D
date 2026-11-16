import { Html } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { openingLabel, openingsOf } from '../../store/openings'
import { WALL_THICKNESS } from './wallBoxes'
import { OpeningSymbol } from './BuildOpenings'
import { SYMBOL_Y } from './wallStrip'

// In 2D a door or window is a flat rectangle on its wall, seen edge-on from
// above, so it cannot be seen. Its mark (J.9.5) is the plan symbol Build
// draws (a gap in the wall; a window with two thin lines, a door with its
// swing, faint), on top of the wall, and its name. The band is a little wider
// than the wall, so the lines read.
const BAND = 0.12
const BAND_ACROSS = -(BAND - WALL_THICKNESS) / 2
// The symbol sits just above the walls' top (Build draws it at SYMBOL_Y).
const ABOVE_WALL = 0.02
// How far into the room the name sits, in meters.
const NAME_GAP = 0.3

function Mark({ id }) {
  const opening = useRoomStore((state) => openingsOf(state.room).find((item) => item.id === id))
  const corners = useRoomStore((state) => state.room.corners)
  const height = useRoomStore((state) => state.room.height)
  const label = useRoomStore((state) => {
    const found = openingsOf(state.room).find((item) => item.id === id)
    return found ? openingLabel(state.room, found) : ''
  })
  const wall = opening && roomWalls(corners)[opening.wallIndex]
  if (!wall) return null
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const middle = opening.offset + opening.width / 2
  const [nx, nz] = wall.normal
  return (
    // A helper: it never shows in a Room render, which sees the rectangle
    // itself. It has no handlers, so a press goes to the rectangle's own box
    // (Openings.jsx), and the name lets clicks through.
    <group userData={{ helper: true }}>
      <OpeningSymbol
        opening={opening}
        wall={wall}
        thickness={BAND}
        across={BAND_ACROSS}
        lift={height + ABOVE_WALL - SYMBOL_Y}
        faint
      />
      <Html
        position={[wall.start.x + dx * middle - nx * NAME_GAP, 0, wall.start.z + dz * middle - nz * NAME_GAP]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="object-name opening-name">{label}</div>
      </Html>
    </group>
  )
}

// A mark for every door and window, in Plan's 2D view (J.9.5).
export default function OpeningMarks() {
  const ids = useRoomStore(useShallow((state) => openingsOf(state.room).map((opening) => opening.id)))
  return ids.map((id) => <Mark key={id} id={id} />)
}
