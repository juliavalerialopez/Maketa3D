import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../../store/roomStore'
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

export default function Walls() {
  const { width, depth, height } = useRoomStore((state) => state.room)
  const wallRefs = useRef([])

  // Walls sit just outside the floor edges; front and back cover the corners.
  const walls = [
    { position: [0, height / 2, -(depth + THICKNESS) / 2], size: [width + 2 * THICKNESS, height, THICKNESS], normal: [0, 0, -1] },
    { position: [0, height / 2, (depth + THICKNESS) / 2], size: [width + 2 * THICKNESS, height, THICKNESS], normal: [0, 0, 1] },
    { position: [-(width + THICKNESS) / 2, height / 2, 0], size: [THICKNESS, height, depth], normal: [-1, 0, 0] },
    { position: [(width + THICKNESS) / 2, height / 2, 0], size: [THICKNESS, height, depth], normal: [1, 0, 0] },
  ]

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
      <meshStandardMaterial color={showWallShades ? WALL_SHADES[index] : WALL_COLOR} />
    </mesh>
  ))
}
