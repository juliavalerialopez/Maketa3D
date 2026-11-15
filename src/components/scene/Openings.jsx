import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { openingsOf } from '../../store/openings'
import { showWallFor } from './wallVisibility'
import { DOOR_COLOR, WINDOW_COLOR } from './roomColors'
import { openingPlacement } from './openingPlacement'

// How far in front of the wall's inside face an opening sits, in meters.
const IN_FRONT = 0.005

// Doors and windows in 3D (J.8, Plan and the Room render): a flat colored
// rectangle just in front of the wall, no hole. Each carries its wall's
// outward side (userData.wallNormal), so it hides with the wall when the
// camera is outside it, like the walls (wallVisibility.js).
export default function Openings() {
  const room = useRoomStore((state) => state.room)
  const meshRefs = useRef([])
  const walls = roomWalls(room.corners)

  useFrame(({ camera }) => {
    meshRefs.current.forEach((mesh) => mesh && showWallFor(mesh, camera))
  })

  return openingsOf(room).map((opening, index) => {
    const wall = walls[opening.wallIndex]
    if (!wall) return null
    const [nx, nz] = wall.normal
    const { position, turn } = openingPlacement(wall, opening, IN_FRONT)
    return (
      <mesh
        key={opening.id}
        ref={(mesh) => (meshRefs.current[index] = mesh)}
        position={position}
        rotation={[0, turn, 0]}
        userData={{ wallNormal: [nx, 0, nz] }}
        receiveShadow
      >
        <planeGeometry args={[opening.width, opening.height]} />
        <meshStandardMaterial color={opening.type === 'door' ? DOOR_COLOR : WINDOW_COLOR} />
      </mesh>
    )
  })
}
