import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { OPENING_EDGE, nearestWall, openingsOf } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import { FLOOR_COLOR } from './roomColors'

// Build's door and window symbols (J.8), flat like the walls.
const LINE_COLOR = '#4a463f'
const WINDOW_FILL = '#eef3f5'
// A selected door or window: the selected wall's clay, lighter.
export const SELECTED_FILL = '#e7c3a9'
// Just above the walls (drawn up to 0.02 m).
const SYMBOL_Y = 0.03
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

// A box along the wall from `from` to `to` (meters along it), `across` from
// its inside line outward to `across + depth`.
function wallBox(wall, from, to, across, depth, y = SYMBOL_Y) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const middle = (from + to) / 2
  const out = across + depth / 2
  const alongX = Math.abs(dz) < 1e-9
  return {
    position: [wall.start.x + dx * middle + nx * out, y, wall.start.z + dz * middle + nz * out],
    size: alongX ? [to - from, 0.01, depth] : [depth, 0.01, to - from],
  }
}

function FlatBox({ box, color }) {
  return (
    <mesh position={box.position}>
      <boxGeometry args={box.size} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

// A door: a gap in the wall, the door leaf standing open into the room and
// the arc it swings along. A window: a pale gap with two thin lines. `color`
// replaces the gap's own (a placing preview, J.8.1).
export function OpeningSymbol({ opening, wall, thickness, selected, color }) {
  const { offset, width } = opening
  const fill = color ?? (selected ? SELECTED_FILL : opening.type === 'door' ? FLOOR_COLOR : WINDOW_FILL)
  const gap = wallBox(wall, offset, offset + width, 0, thickness)
  if (opening.type === 'window') {
    return (
      <>
        <FlatBox box={gap} color={fill} />
        <FlatBox box={wallBox(wall, offset, offset + width, thickness * 0.3, LINE, SYMBOL_Y + 0.005)} color={LINE_COLOR} />
        <FlatBox box={wallBox(wall, offset, offset + width, thickness * 0.7 - LINE, LINE, SYMBOL_Y + 0.005)} color={LINE_COLOR} />
      </>
    )
  }
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  // The hinge at the door's near end, on the wall's inside line.
  const hinge = [wall.start.x + dx * offset, wall.start.z + dz * offset]
  // The arc from the closed door (along the wall) to the open one (into the
  // room), a quarter turn.
  const closed = flatAngle(dx, dz)
  const open = flatAngle(-nx, -nz)
  const turn = Math.atan2(Math.sin(open - closed), Math.cos(open - closed))
  const thetaStart = turn > 0 ? closed : open
  const alongX = Math.abs(dz) < 1e-9
  return (
    <>
      <FlatBox box={gap} color={fill} />
      <mesh position={[hinge[0], SYMBOL_Y + 0.005, hinge[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width - LINE / 2, width + LINE / 2, 32, 1, thetaStart, Math.PI / 2]} />
        <meshBasicMaterial color={LINE_COLOR} />
      </mesh>
      {/* The leaf, open into the room. */}
      <mesh position={[hinge[0] - (nx * width) / 2, SYMBOL_Y + 0.005, hinge[1] - (nz * width) / 2]}>
        <boxGeometry args={alongX ? [LINE * 2, 0.01, width] : [width, 0.01, LINE * 2]} />
        <meshBasicMaterial color={LINE_COLOR} />
      </mesh>
    </>
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
