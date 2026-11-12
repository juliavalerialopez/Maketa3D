import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { ROOM_LIMITS, WALL_SNAP, draggedCorners, reachableStep, useRoomStore } from '../../store/roomStore'
import { MIN_WALL } from '../../store/roomShape'
import { beginGesture, editGesture, endGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'
import Floor from './Floor'
import { wallBoxes } from './wallBoxes'

// Build draws the walls flat and dark, thicker than in 3D so they read from
// above. Outward from the inside edge, so the room's inside size is the same.
const BUILD_WALL_THICKNESS = 0.12
const BUILD_WALL_COLOR = '#4a463f'
// A hovered wall (J.6): warm clay, the same in both themes like the floor.
const BUILD_WALL_HOVER_COLOR = '#b5653d'
// How wide the invisible strip to grab a wall is, in meters.
const WALL_GRAB = 0.4
// Drags happen on the floor.
const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()
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

// One wall is dragged at a time; meanwhile the others ignore the pointer.
let wallDragActive = false

// One wall, with a wider invisible strip around it to grab (J.6). Hovering
// highlights it; dragging moves it sideways only, in 5 cm steps, its corners
// with it, so the walls next to it stretch or shrink. It stops where the room
// would stop being allowed. The whole drag is one undo step.
function BuildWall({ index, box }) {
  const getThree = useThree((state) => state.get)
  const [hovered, setHovered] = useState(false)
  const hoveredRef = useRef(false)
  // Active drag: { pointerId, corners (before the drag), normal, start:
  // [x, z], step, shown (the corners this drag set last) }.
  const dragRef = useRef(null)
  const { wall } = box
  const alongX = Math.abs(wall.end.z - wall.start.z) < 1e-9

  function setControls(enabled) {
    const { controls } = getThree()
    if (controls) controls.enabled = enabled
  }

  function hover(on) {
    hoveredRef.current = on
    setHovered(on)
    document.body.style.cursor = on ? (alongX ? 'ns-resize' : 'ew-resize') : ''
  }

  // Ends the drag: its undo step closes and pan comes back.
  function stopDrag() {
    dragRef.current = null
    wallDragActive = false
    endGesture()
    setControls(true)
  }

  // Removed mid-drag or while under the pointer (e.g. leaving Build): the
  // drag ends and the cursor comes back.
  useEffect(
    () => () => {
      if (hoveredRef.current) document.body.style.cursor = ''
      if (!dragRef.current) return
      dragRef.current = null
      wallDragActive = false
      endGesture()
      const { controls } = getThree()
      if (controls) controls.enabled = true
    },
    [getThree],
  )

  function handlePointerDown(event) {
    if (event.button !== 0 || wallDragActive) return
    event.stopPropagation()
    if (!event.ray.intersectPlane(FLOOR, hit)) return
    const { corners } = useRoomStore.getState().room
    dragRef.current = { pointerId: event.pointerId, corners, normal: wall.normal, start: [hit.x, hit.z], step: 0, shown: corners }
    wallDragActive = true
    beginGesture()
    event.target.setPointerCapture(event.pointerId)
    setControls(false)
  }

  function handlePointerMove(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    event.stopPropagation()
    // The room was replaced meanwhile (New Project, Open Project): the drag
    // ends instead of writing the old room back.
    if (useRoomStore.getState().room.corners !== current.shown) {
      event.target.releasePointerCapture(event.pointerId)
      stopDrag()
      return
    }
    if (!event.ray.intersectPlane(FLOOR, hit)) return
    // How far the pointer went out of the room, across the wall.
    const [nx, nz] = current.normal
    const out = (hit.x - current.start[0]) * nx + (hit.z - current.start[1]) * nz
    const step = reachableStep(current.corners, index, current.step, Math.round(out / WALL_SNAP))
    if (step === current.step) return
    current.step = step
    useRoomStore.getState().setCorners(draggedCorners(current.corners, index, step))
    current.shown = useRoomStore.getState().room.corners
  }

  function handlePointerUp(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    event.target.releasePointerCapture(event.pointerId)
    stopDrag()
  }

  return (
    <>
      <mesh position={box.position}>
        <boxGeometry args={box.size} />
        <meshBasicMaterial color={hovered ? BUILD_WALL_HOVER_COLOR : BUILD_WALL_COLOR} />
      </mesh>
      <mesh
        position={box.position}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (!wallDragActive) hover(true)
        }}
        // While dragging the wall stays highlighted; after the release, the
        // next move that leaves it turns it back.
        onPointerOut={() => {
          if (!dragRef.current && hoveredRef.current) hover(false)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(event) => {
          handlePointerUp(event)
          hover(false)
        }}
      >
        <boxGeometry args={alongX ? [box.size[0], 0.1, WALL_GRAB] : [WALL_GRAB, 0.1, box.size[2]]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}

// The Build view (J.5): the room from above, flat, with no light or shadow:
// the floor in its color, the walls dark, each wall's length next to it.
// Furniture is not shown. Walls can be dragged (J.6).
export default function BuildScene() {
  const { corners } = useRoomStore((state) => state.room)
  const walls = wallBoxes(corners, WALL_DRAW_HEIGHT, BUILD_WALL_THICKNESS)

  return (
    <>
      <Floor flat />
      {walls.map((box, index) => (
        <BuildWall key={index} index={index} box={box} />
      ))}
      {walls.map((box, index) => (
        <WallLength key={index} index={index} wall={box.wall} />
      ))}
    </>
  )
}
