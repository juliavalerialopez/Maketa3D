import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { showWallFor } from './wallVisibility'
import { openingPlacement } from './openingPlacement'
import { raycastWhenShown } from './raycastWhenShown'

// How far in front of the wall's inside face the invisible layer sits (behind
// a placed opening, which is 0.005 in front) and the preview (above it).
const LAYER_GAP = 0.002
const PREVIEW_GAP = 0.01
// The mark where a window would start: a thin strip up the wall.
const MARK_WIDTH = 0.05

// The turn about y that makes a plane (facing +z) face into the room.
const turnOf = ([nx, nz]) => Math.atan2(-nx, -nz)

// The 3D view's pointer layer for the placing tools (J.9.4): an invisible
// plane over each wall's inside face, hiding with its wall like the openings.
// `onAim(index, point)` follows the pointer on a wall, `onPick(index, point)`
// is a click on it, `onLeave` the pointer leaving the walls.
export function WallLayers({ walls, height, onAim, onPick, onLeave }) {
  return walls.map((wall, index) => (
    <WallLayer key={index} wall={wall} height={height} index={index} onAim={onAim} onPick={onPick} onLeave={onLeave} />
  ))
}

function WallLayer({ wall, height, index, onAim, onPick, onLeave }) {
  const ref = useRef(null)
  useFrame(({ camera }) => {
    if (ref.current) showWallFor(ref.current, camera)
  })
  const [nx, nz] = wall.normal
  return (
    <group
      ref={ref}
      position={[(wall.start.x + wall.end.x) / 2 - nx * LAYER_GAP, height / 2, (wall.start.z + wall.end.z) / 2 - nz * LAYER_GAP]}
      rotation={[0, turnOf(wall.normal), 0]}
      userData={{ wallNormal: [nx, 0, nz] }}
    >
      <mesh
        raycast={raycastWhenShown}
        onPointerMove={(event) => {
          event.stopPropagation()
          onAim(index, event.point)
        }}
        onPointerOut={onLeave}
        onClick={(event) => {
          event.stopPropagation()
          onPick(index, event.point, event.delta)
        }}
      >
        <planeGeometry args={[wall.length, height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

// What a click would do, drawn on the wall in 3D: the opening's rectangle, or
// for a window's start a strip up the wall. `preview` is a PlaceOpening one:
// { opening } or { point: { wallIndex, along } }. A helper, so it never shows
// in a Room render; it hides with its wall.
export function WallPreview({ preview, walls, height, color }) {
  const ref = useRef(null)
  useFrame(({ camera }) => {
    if (ref.current) showWallFor(ref.current, camera)
  })
  const point = preview.point
  const wall = walls[point ? point.wallIndex : preview.opening.wallIndex]
  if (!wall) return null
  const [nx, nz] = wall.normal
  let position
  let size
  if (point) {
    const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
    position = [wall.start.x + dx * point.along - nx * PREVIEW_GAP, height / 2, wall.start.z + dz * point.along - nz * PREVIEW_GAP]
    size = [MARK_WIDTH, height]
  } else {
    position = openingPlacement(wall, preview.opening, PREVIEW_GAP).position
    size = [preview.opening.width, preview.opening.height]
  }
  return (
    <group userData={{ helper: true }}>
      <group ref={ref} position={position} rotation={[0, turnOf(wall.normal), 0]} userData={{ wallNormal: [nx, 0, nz] }}>
        <mesh raycast={() => null}>
          <planeGeometry args={size} />
          <meshBasicMaterial color={color} transparent opacity={0.75} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
