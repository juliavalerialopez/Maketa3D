import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { showWallFor } from './wallVisibility'

const THICKNESS = 0.05
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

// One box per wall of the room (J.2), sitting just outside the floor edge
// (`normal` points out of the room). A wall along x also covers the outer
// corner square at each end that turns outward, so every outer corner is
// closed by exactly one wall; for a rectangle that is the front and back
// walls, as before.
function wallBoxes(corners, height) {
  return roomWalls(corners).map(({ start, end, length, normal, startConvex, endConvex }) => {
    const alongX = Math.abs(end.z - start.z) < 1e-9
    const before = alongX && startConvex ? THICKNESS : 0
    const after = alongX && endConvex ? THICKNESS : 0
    const [dx, dz] = [(end.x - start.x) / length, (end.z - start.z) / length]
    // From the wall's middle: out by half a thickness, and along it toward
    // the end that is longer.
    const shift = (after - before) / 2
    const x = (start.x + end.x) / 2 + (normal[0] * THICKNESS) / 2 + dx * shift
    const z = (start.z + end.z) / 2 + (normal[1] * THICKNESS) / 2 + dz * shift
    const span = length + before + after
    return {
      position: [x, height / 2, z],
      size: alongX ? [span, height, THICKNESS] : [THICKNESS, height, span],
      normal: [normal[0], 0, normal[1]],
      shade: wallShade(normal),
    }
  })
}

export default function Walls() {
  const { corners, height } = useRoomStore((state) => state.room)
  const wallRefs = useRef([])
  const walls = wallBoxes(corners, height)

  // Hide a wall when the Plan camera is on its outer side, so the interior
  // stays visible. Visibility is set on the mesh directly, never through
  // React state.
  useFrame(({ camera }) => {
    wallRefs.current.forEach((mesh) => mesh && showWallFor(mesh, camera))
  })

  return walls.map((wall, index) => (
    <mesh
      key={index}
      ref={(mesh) => (wallRefs.current[index] = mesh)}
      position={wall.position}
      userData={{ wallNormal: wall.normal }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={wall.size} />
      <meshStandardMaterial color={showWallShades ? wall.shade : WALL_COLOR} />
    </mesh>
  ))
}
