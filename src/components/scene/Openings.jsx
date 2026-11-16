import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { OPENING_EDGE, openingsOf } from '../../store/openings'
import { useObjectsStore } from '../../store/objectsStore'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import { showWallFor } from './wallVisibility'
import { DOOR_COLOR, WINDOW_COLOR } from './roomColors'
import { openingPlacement } from './openingPlacement'
import { isWidgetActive } from './widgetState'
import { raycastWhenShown } from './raycastWhenShown'

// How far in front of the wall's inside face an opening sits, in meters.
const IN_FRONT = 0.005
// The invisible box to press it by (J.9.2), so it can be pressed from
// straight above in 2D too: from its face back through the wall and out of
// the room this far, where nothing else is, so furniture against the wall
// stays pressable.
const GRAB_DEPTH = 0.15
// Dragged in 5 cm steps, like in Build.
const SNAP = 0.05
const snap = (value) => Math.round(value / SNAP) * SNAP

const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

// Where the pointer is on `wall`: { along (meters from its first corner),
// height (meters above the floor, null in 2D) }, or null when the ray misses.
// In 3D the pointer goes on the wall's inside face; in 2D, from above, on the
// floor.
function pointerOnWall(ray, wall, topView) {
  const [nx, nz] = wall.normal
  const plane = topView
    ? FLOOR
    : new Plane(new Vector3(nx, 0, nz), -(nx * wall.start.x + nz * wall.start.z))
  if (!ray.intersectPlane(plane, hit)) return null
  const along =
    ((hit.x - wall.start.x) * (wall.end.x - wall.start.x) + (hit.z - wall.start.z) * (wall.end.z - wall.start.z)) /
    wall.length
  return { along, height: topView ? null : hit.y }
}

// One door or window: a flat colored rectangle just in front of the wall, no
// hole (J.8). It carries its wall's outward side (userData.wallNormal), so it
// hides with the wall when the camera is outside it, like the walls
// (wallVisibility.js). In Plan's 2D and 3D views (J.9.2) a press selects it
// and dragging moves it on its own wall in 5 cm steps, staying 0.1 m from its
// ends and off other openings; in 3D a window also moves up and down, under
// the ceiling. The whole drag is one undo step.
function SceneOpening({ id }) {
  const opening = useRoomStore((state) => openingsOf(state.room).find((item) => item.id === id))
  const corners = useRoomStore((state) => state.room.corners)
  const getThree = useThree((state) => state.get)
  const groupRef = useRef(null)
  // Active drag: { pointerId, grabAlong, grabHeight, vertical, topView }.
  const dragRef = useRef(null)

  // Removed mid-drag (Delete, undo, New Project): no pointer up comes.
  useEffect(
    () => () => {
      if (!dragRef.current) return
      dragRef.current = null
      endGesture()
      const { controls } = getThree()
      if (controls) controls.enabled = true
    },
    [getThree],
  )

  useFrame(({ camera }) => {
    if (groupRef.current) showWallFor(groupRef.current, camera)
  })

  const wall = opening && roomWalls(corners)[opening.wallIndex]
  if (!wall) return null

  function handlePointerDown(event) {
    // Hidden with its wall, or in Walk (for looking only): not pressed.
    if (event.button !== 0 || !groupRef.current?.visible) return
    const ui = useUiStore.getState()
    // With a placing tool on, a press is for placing (PlaceOpening).
    if (ui.sceneView === 'walk' || ui.tool || isWidgetActive()) return
    event.stopPropagation()
    useObjectsStore.getState().selectObject(null)
    ui.selectOpening(id)
    const topView = ui.sceneView === '2d'
    const point = pointerOnWall(event.ray, wall, topView)
    if (!point) return
    dragRef.current = {
      pointerId: event.pointerId,
      grabAlong: point.along - opening.offset,
      grabHeight: point.height === null ? 0 : point.height - opening.sill,
      vertical: !topView && opening.type === 'window',
      topView,
    }
    beginGesture()
    event.target.setPointerCapture(event.pointerId)
    const { controls } = getThree()
    if (controls) controls.enabled = false
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    const { room, updateOpening } = useRoomStore.getState()
    const current = openingsOf(room).find((item) => item.id === id)
    const currentWall = current && roomWalls(room.corners)[current.wallIndex]
    if (!currentWall) return
    const point = pointerOnWall(event.ray, currentWall, drag.topView)
    if (!point) return
    const maxOffset = currentWall.length - OPENING_EDGE - current.width
    const offset = Math.min(maxOffset, Math.max(OPENING_EDGE, snap(point.along - drag.grabAlong))) + 0
    if (!drag.vertical) {
      updateOpening(id, { offset })
      return
    }
    const sill = Math.min(room.height - current.height, Math.max(0, snap(point.height - drag.grabHeight))) + 0
    // Blocked by another opening both ways: it still slides the way that is free.
    if (updateOpening(id, { offset, sill }) || updateOpening(id, { offset })) return
    updateOpening(id, { sill })
  }

  function handlePointerUp(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    event.target.releasePointerCapture(event.pointerId)
    endGesture()
    const { controls } = getThree()
    if (controls) controls.enabled = true
  }

  const [nx, nz] = wall.normal
  const { position, turn } = openingPlacement(wall, opening, IN_FRONT)
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, turn, 0]}
      userData={{ wallNormal: [nx, 0, nz] }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <mesh receiveShadow raycast={raycastWhenShown}>
        <planeGeometry args={[opening.width, opening.height]} />
        <meshStandardMaterial color={opening.type === 'door' ? DOOR_COLOR : WINDOW_COLOR} />
      </mesh>
      <mesh position={[0, 0, -GRAB_DEPTH / 2]} raycast={raycastWhenShown}>
        <boxGeometry args={[opening.width, opening.height, GRAB_DEPTH]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

// Every door and window in 3D (J.8: Plan and the Room render).
export default function Openings() {
  // Only the ids: the list re-renders when one is added or removed.
  const ids = useRoomStore(useShallow((state) => openingsOf(state.room).map((opening) => opening.id)))
  return ids.map((id) => <SceneOpening key={id} id={id} />)
}
