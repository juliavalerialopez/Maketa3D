import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../../store/roomStore'

const THICKNESS = 0.05

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

  // Hide a wall when the camera is on its outer side, so the interior stays visible.
  // Visibility is set on the mesh directly, never through React state.
  useFrame(({ camera }) => {
    walls.forEach((wall, index) => {
      const mesh = wallRefs.current[index]
      if (!mesh) return
      const [px, py, pz] = wall.position
      const [nx, ny, nz] = wall.normal
      const facing =
        (camera.position.x - px) * nx +
        (camera.position.y - py) * ny +
        (camera.position.z - pz) * nz
      mesh.visible = facing <= 0
    })
  })

  return walls.map((wall, index) => (
    <mesh
      key={index}
      ref={(mesh) => (wallRefs.current[index] = mesh)}
      position={wall.position}
      castShadow
      receiveShadow
    >
      <boxGeometry args={wall.size} />
      <meshStandardMaterial color="#d8d4cc" />
    </mesh>
  ))
}
