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
// gets its own clearly different light shade (back, front, left, right), so
// the corners show in the Room render. Same in both themes. See
// docs/prompts/restyle.md, "Wall shades test".
const WALL_SHADES = ['#ece7da', '#d4ccba', '#bdb4a0', '#f8f5ee']
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
