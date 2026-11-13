import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../../store/roomStore'
import { showWallFor } from './wallVisibility'
import { wallBoxes } from './wallBoxes'
import { HIGHLIGHT_COLOR } from './roomColors'
import { useUiStore } from '../../store/uiStore'

// Light ivory from the soft UI palette. The same in both themes, so the Room
// render sent to the AI does not depend on the theme.
const WALL_COLOR = '#ece7da'

// I.15 wall-shades test, local only: with ?wallShades in the address of the
// dev server (npm run dev or npx vercel dev, never the live site), each wall
// gets its own light tint (back sand, front blue, left sage, right clay),
// each clearly different from the others and from WALL_COLOR, so any two
// walls that meet show their corner in the Room render (I.15.2). Same in
// both themes. See docs/prompts/restyle.md, "Wall shades test".
const WALL_SHADES = ['#e8d9b5', '#cfdde8', '#d3e3cc', '#ecd0c8']
const showWallShades = import.meta.env.DEV && new URLSearchParams(window.location.search).has('wallShades')

// The wall-shades tint for a wall, by which way it faces out of the room.
function wallShade([nx, nz]) {
  if (nz < 0) return WALL_SHADES[0]
  if (nz > 0) return WALL_SHADES[1]
  return nx < 0 ? WALL_SHADES[2] : WALL_SHADES[3]
}

// While a Room configuration field is under the pointer (J.4.2), the walls
// it changes are clay, with a clay line along their foot on the floor, so a
// wall the camera hides still shows. For Height only the walls' top edge is
// clay. Line and edge are helpers: never in the Room render.
const LINE_WIDTH = 0.08
const LINE_Y = 0.004
// The top edge: a thin clay cap on each wall, a little wider than it.
const EDGE_HEIGHT = 0.01
const EDGE_OVERHANG = 0.004

function WallHighlightLine({ wall }) {
  const { start, end, length, normal } = wall
  const [x, z] = [(start.x + end.x) / 2 - (normal[0] * LINE_WIDTH) / 2, (start.z + end.z) / 2 - (normal[1] * LINE_WIDTH) / 2]
  const alongX = Math.abs(end.z - start.z) < 1e-9
  return (
    <mesh position={[x, LINE_Y, z]} userData={{ helper: true }}>
      <boxGeometry args={alongX ? [length, 0.002, LINE_WIDTH] : [LINE_WIDTH, 0.002, length]} />
      <meshBasicMaterial color={HIGHLIGHT_COLOR} />
    </mesh>
  )
}

// The room's walls in 3D (Plan, Room render): one box per wall (wallBoxes).
export default function Walls() {
  const { corners, height } = useRoomStore((state) => state.room)
  const highlighted = useUiStore((state) => state.highlightedWalls)
  const topEdge = useUiStore((state) => state.highlightedTop)
  const wallRefs = useRef([])
  const walls = wallBoxes(corners, height)

  // Hide a wall when the Plan camera is on its outer side, so the interior
  // stays visible. Visibility is set on the mesh directly, never through
  // React state.
  useFrame(({ camera }) => {
    wallRefs.current.forEach((mesh) => mesh && showWallFor(mesh, camera))
  })

  const colorOf = (wall, index) => {
    if (highlighted.includes(index)) return HIGHLIGHT_COLOR
    return showWallShades ? wallShade(wall.wall.normal) : WALL_COLOR
  }

  return (
    <>
      {walls.map((wall, index) => (
        <mesh
          key={index}
          ref={(mesh) => (wallRefs.current[index] = mesh)}
          position={wall.position}
          userData={{ wallNormal: wall.normal }}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color={colorOf(wall, index)} />
          {/* A child of the wall, so it hides with it. */}
          {topEdge && (
            <mesh position={[0, wall.size[1] / 2 + EDGE_HEIGHT / 2, 0]} userData={{ helper: true }}>
              <boxGeometry
                args={[wall.size[0] + EDGE_OVERHANG, EDGE_HEIGHT, wall.size[2] + EDGE_OVERHANG]}
              />
              <meshBasicMaterial color={HIGHLIGHT_COLOR} />
            </mesh>
          )}
        </mesh>
      ))}
      {highlighted.map((index) => walls[index] && <WallHighlightLine key={index} wall={walls[index].wall} />)}
    </>
  )
}
