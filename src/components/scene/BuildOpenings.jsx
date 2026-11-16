import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { OPENING_EDGE, nearestWall, openingsOf, swingOf } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import { FLOOR_COLOR } from './roomColors'
import { SYMBOL_Y, wallStrip } from './wallStrip'

// Build's door and window symbols (J.8), flat like the walls.
const LINE_COLOR = '#4a463f'
const WINDOW_FILL = '#eef3f5'
// A selected door or window: the selected wall's clay, lighter.
export const SELECTED_FILL = '#e7c3a9'
const LINE = 0.015
// How wide the invisible strip to grab an opening is, and how near a wall
// the pointer must be to move it there, in meters.
const OPENING_GRAB = 0.5
const WALL_REACH = 0.6
// Openings move in 5 cm steps, like walls.
const SNAP = 0.05

const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

// The floor angle of world direction (x, z) for a flat ring (laid down by
// -90° about x, so local y is world -z).
const flatAngle = (x, z) => Math.atan2(-z, x)

const wallBox = wallStrip

function FlatBox({ box, color, opacity = 1 }) {
  return (
    <mesh position={box.position}>
      <boxGeometry args={box.size} />
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </mesh>
  )
}

// How strong a door's swing shows when `faint` (Plan's 2D view, J.9.5).
const FAINT_OPACITY = 0.4

// A door: a gap in the wall, the door leaf standing open and the arc it
// swings along, into the room or out of it (J.8.5). A window: a pale gap with
// two thin lines. `color` replaces the gap's own (a placing preview, J.8.1).
// The same symbol is drawn in Plan's 2D view (J.9.5), with the gap band
// starting `across` from the wall's inside line (a negative one reaches into
// the room), everything `lift` higher (on top of the walls), and a door's
// swing `faint`, so it does not fight the furniture.
export function OpeningSymbol({ opening, wall, thickness, selected, color, across = 0, lift = 0, faint = false }) {
  const { offset, width } = opening
  const fill = color ?? (selected ? SELECTED_FILL : opening.type === 'door' ? FLOOR_COLOR : WINDOW_FILL)
  const gap = wallBox(wall, offset, offset + width, across, thickness)
  if (opening.type === 'window') {
    return (
      <group position={[0, lift, 0]}>
        <FlatBox box={gap} color={fill} />
        <FlatBox box={wallBox(wall, offset, offset + width, across + thickness * 0.3, LINE, SYMBOL_Y + 0.005)} color={LINE_COLOR} />
        <FlatBox box={wallBox(wall, offset, offset + width, across + thickness * 0.7 - LINE, LINE, SYMBOL_Y + 0.005)} color={LINE_COLOR} />
      </group>
    )
  }
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  // Which way it opens: into the room (against the wall's outward side) or out.
  const sign = swingOf(opening) === 'out' ? 1 : -1
  const [ox, oz] = [sign * nx, sign * nz]
  // The hinge at the door's near end, on the wall's inside line.
  const hinge = [wall.start.x + dx * offset, wall.start.z + dz * offset]
  // The arc from the closed door (along the wall) to the open one, a quarter turn.
  const closed = flatAngle(dx, dz)
  const open = flatAngle(ox, oz)
  const turn = Math.atan2(Math.sin(open - closed), Math.cos(open - closed))
  const thetaStart = turn > 0 ? closed : open
  const alongX = Math.abs(dz) < 1e-9
  const opacity = faint ? FAINT_OPACITY : 1
  return (
    <group position={[0, lift, 0]}>
      <FlatBox box={gap} color={fill} />
      <mesh position={[hinge[0], SYMBOL_Y + 0.005, hinge[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width - LINE / 2, width + LINE / 2, 32, 1, thetaStart, Math.PI / 2]} />
        <meshBasicMaterial color={LINE_COLOR} transparent={faint} opacity={opacity} depthWrite={!faint} />
      </mesh>
      {/* The leaf, open. */}
      <mesh position={[hinge[0] + (ox * width) / 2, SYMBOL_Y + 0.005, hinge[1] + (oz * width) / 2]}>
        <boxGeometry args={alongX ? [LINE * 2, 0.01, width] : [width, 0.01, LINE * 2]} />
        <meshBasicMaterial color={LINE_COLOR} transparent={faint} opacity={opacity} depthWrite={!faint} />
      </mesh>
    </group>
  )
}

// One door or window: its symbol, and a strip to grab it. A press selects
// it; dragging slides it along its wall, or onto another wall when the
// pointer gets near one, in 5 cm steps, staying 0.1 m from the wall's ends
// and off other openings. The whole drag is one undo step.
function BuildOpening({ opening, wall, thickness, selected }) {
  const getThree = useThree((state) => state.get)
  // Active drag: { pointerId, grab (where along the opening it was taken) }.
  const dragRef = useRef(null)

  function setControls(enabled) {
    const { controls } = getThree()
    if (controls) controls.enabled = enabled
  }

  // Removed mid-drag (deleted, undo, New Project): the drag ends.
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

  const along = (x, z) =>
    ((x - wall.start.x) * (wall.end.x - wall.start.x) + (z - wall.start.z) * (wall.end.z - wall.start.z)) / wall.length

  function handlePointerDown(event) {
    if (event.button !== 0) return
    event.stopPropagation()
    if (!event.ray.intersectPlane(FLOOR, hit)) return
    useUiStore.getState().selectOpening(opening.id)
    useUiStore.getState().setBuildNotice(null)
    dragRef.current = { pointerId: event.pointerId, grab: along(hit.x, hit.z) - opening.offset, wallIndex: opening.wallIndex }
    beginGesture()
    event.target.setPointerCapture(event.pointerId)
    setControls(false)
  }

  function handlePointerMove(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    event.stopPropagation()
    if (!event.ray.intersectPlane(FLOOR, hit)) return
    const { room, updateOpening } = useRoomStore.getState()
    const nearest = nearestWall(room.corners, hit.x, hit.z, WALL_REACH)
    if (!nearest) return
    const target = roomWalls(room.corners)[nearest.wallIndex]
    // On a new wall it is held by its middle (once it is there).
    const changing = nearest.wallIndex !== current.wallIndex
    const grab = changing ? opening.width / 2 : current.grab
    const maxOffset = target.length - OPENING_EDGE - opening.width
    if (maxOffset < OPENING_EDGE) return
    const offset = Math.min(maxOffset, Math.max(OPENING_EDGE, Math.round((nearest.along - grab) / SNAP) * SNAP))
    if (updateOpening(opening.id, { wallIndex: nearest.wallIndex, offset }) && changing) {
      current.wallIndex = nearest.wallIndex
      current.grab = grab
    }
  }

  function handlePointerUp(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    dragRef.current = null
    event.target.releasePointerCapture(event.pointerId)
    endGesture()
    setControls(true)
  }

  // The strip sits above the walls' own, so a press on an opening is its own.
  const strip = wallBox(wall, opening.offset, opening.offset + opening.width, (thickness - OPENING_GRAB) / 2, OPENING_GRAB, 0.12)

  return (
    <>
      <OpeningSymbol opening={opening} wall={wall} thickness={thickness} selected={selected} />
      <mesh
        position={strip.position}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          if (!dragRef.current) document.body.style.cursor = ''
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <boxGeometry args={[strip.size[0], 0.1, strip.size[2]]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}

// Every door and window of the room in Build (J.8).
export default function BuildOpenings({ thickness }) {
  const room = useRoomStore((state) => state.room)
  const selected = useUiStore((state) => state.selectedOpening)
  const walls = roomWalls(room.corners)
  return openingsOf(room)
    .filter((opening) => walls[opening.wallIndex])
    .map((opening) => (
      <BuildOpening
        key={opening.id}
        opening={opening}
        wall={walls[opening.wallIndex]}
        thickness={thickness}
        selected={opening.id === selected}
      />
    ))
}
