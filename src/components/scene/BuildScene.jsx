import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { WALL_SNAP, draggedRoom, reachableStep, startWallDrag, useRoomStore } from '../../store/roomStore'
import { MIN_CUT_WALL, cutPoint, findWall, splitWall } from '../../store/roomShape'
import { BUILD_NOTICES, useUiStore } from '../../store/uiStore'
import BuildOpenings from './BuildOpenings'
import PlaceOpening from './PlaceOpening'
import WallBar from './WallBar'
import BuildDistances from './BuildDistances'
import { meters } from './buildText'
import { focusIsFree } from '../panel/useObjectShortcuts'
import { beginGesture, endGesture } from '../../store/historyStore'
import Floor from './Floor'
import { wallBoxes } from './wallBoxes'

// Build draws the walls flat and dark, thicker than in 3D so they read from
// above. Outward from the inside edge, so the room's inside size is the same.
// The colors are the same in both themes, like the floor.
const BUILD_WALL_THICKNESS = 0.12
const BUILD_WALL_COLOR = '#4a463f'
// The selected wall (J.7): warm clay; a hovered one (J.6): a lighter clay.
const BUILD_WALL_SELECTED_COLOR = '#b5653d'
const BUILD_WALL_HOVER_COLOR = '#c98a63'
// Where a cut would go (J.7.1): a pale sand line across the wall, with its
// distance to each end inside the room.
const CUT_MARK_COLOR = '#f1e3c6'
const CUT_MARK_WIDTH = 0.04
// How wide the invisible strip to grab a wall is, in meters.
const WALL_GRAB = 0.4
// Drags happen on the floor.
const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()
// Just above the floor, flat.
const WALL_DRAW_HEIGHT = 0.02
// How far outside a wall its length sits, in meters.
const LABEL_GAP = 0.45

// One wall is dragged at a time; meanwhile the others ignore the pointer.
let wallDragActive = false

const wallSelection = (wall) => ({ a: { ...wall.start }, b: { ...wall.end } })

// A wall's inside length as text, at its middle just outside the room (J.5,
// J.5.1). It is typed in the panel, once the wall is selected.
function WallLength({ wall }) {
  const [mx, mz] = [(wall.start.x + wall.end.x) / 2, (wall.start.z + wall.end.z) / 2]
  const gap = BUILD_WALL_THICKNESS + LABEL_GAP
  return (
    <Html position={[mx + wall.normal[0] * gap, 0, mz + wall.normal[1] * gap]} center>
      <div className="wall-length">{meters(wall.length)}</div>
    </Html>
  )
}

// How far along `wall` the floor point (x, z) is, from its start.
function alongWall(wall, x, z) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  return (x - wall.start.x) * dx + (z - wall.start.z) * dz
}

// One wall, with a wider invisible strip around it to grab.
// - A press selects it (J.7); hovering highlights it (J.6).
// - Dragging moves it sideways only, in 5 cm steps, its corners with it, so
//   the walls next to it stretch or shrink. It stops where the room would
//   stop being allowed. The whole drag is one undo step (J.6). A piece cut
//   out of a longer wall gets side walls as it moves, and is one wall again
//   once back in line (J.7).
// - With Cut on, a point follows the pointer on any wall, with its distance
//   to both ends; a press splits the wall in two there (J.7.1).
function BuildWall({ index, box, selected, highlighted, cutting, onDragChange }) {
  const getThree = useThree((state) => state.get)
  const [hovered, setHovered] = useState(false)
  const hoveredRef = useRef(false)
  // Where a cut would go, meters along the wall, while hovering with Cut on.
  const [cutAt, setCutAt] = useState(null)
  // Active drag: { pointerId, room (before the drag), drag (startWallDrag),
  // start: [x, z], step, shown (the corners this drag set last) }. The walls
  // may be renumbered meanwhile, so it keeps all it needs.
  const dragRef = useRef(null)
  const { wall } = box
  const alongX = Math.abs(wall.end.z - wall.start.z) < 1e-9
  const cuttingHere = cutting && wall.length >= MIN_CUT_WALL - 1e-9
  // With Cut off, no old point is kept for the next time it is on.
  if (!cuttingHere && cutAt !== null) setCutAt(null)

  function setControls(enabled) {
    const { controls } = getThree()
    if (controls) controls.enabled = enabled
  }

  function hover(on) {
    hoveredRef.current = on
    setHovered(on)
    // With Cut on, a wall too short to cut shows it can't be.
    const cursor = cutting ? (cuttingHere ? 'crosshair' : 'not-allowed') : alongX ? 'ns-resize' : 'ew-resize'
    document.body.style.cursor = on ? cursor : ''
  }

  // Ends the drag: its undo step closes and pan comes back. A wall merged
  // back in line is no longer selected.
  function stopDrag() {
    dragRef.current = null
    wallDragActive = false
    onDragChange(false)
    endGesture()
    setControls(true)
    const { selectedWall, selectWall } = useUiStore.getState()
    if (selectedWall && findWall(useRoomStore.getState().room.corners, selectedWall.a, selectedWall.b) === -1) {
      selectWall(null)
    }
  }

  // Removed mid-drag or while under the pointer (e.g. leaving Build): the
  // drag ends and the cursor comes back.
  useEffect(
    () => () => {
      if (hoveredRef.current) document.body.style.cursor = ''
      if (!dragRef.current) return
      dragRef.current = null
      wallDragActive = false
      onDragChange(false)
      endGesture()
      const { controls } = getThree()
      if (controls) controls.enabled = true
    },
    [getThree, onDragChange],
  )

  function handlePointerDown(event) {
    if (event.button !== 0 || wallDragActive) return
    event.stopPropagation()
    // With Cut on, a wall too short to cut ignores the press.
    if (cutting && !cuttingHere) return
    if (!event.ray.intersectPlane(FLOOR, hit)) return
    const { room } = useRoomStore.getState()
    const ui = useUiStore.getState()
    ui.setBuildNotice(null)
    if (cuttingHere) {
      // Split: Cut is off and nothing is selected, so either piece can be
      // picked next. A cut through a door or window is refused, Cut stays on.
      const corners = splitWall(room.corners, index, alongWall(wall, hit.x, hit.z))
      const problem = corners ? useRoomStore.getState().setCorners(corners) : 'shape'
      if (problem === 'openings') {
        ui.setBuildNotice(BUILD_NOTICES.cut)
        return
      }
      if (problem) return
      ui.selectWall(null)
      setCutAt(null)
      // The pointer shows the wall can be dragged.
      document.body.style.cursor = alongX ? 'ns-resize' : 'ew-resize'
      return
    }
    ui.selectWall(wallSelection(wall))
    dragRef.current = {
      pointerId: event.pointerId,
      room,
      drag: startWallDrag(room, index),
      start: [hit.x, hit.z],
      step: 0,
      shown: room.corners,
    }
    wallDragActive = true
    onDragChange(true)
    beginGesture()
    event.target.setPointerCapture(event.pointerId)
    setControls(false)
  }

  function handlePointerMove(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) {
      if (cuttingHere && event.ray.intersectPlane(FLOOR, hit)) {
        setCutAt(cutPoint(useRoomStore.getState().room.corners, index, alongWall(wall, hit.x, hit.z)))
      }
      return
    }
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
    const [nx, nz] = current.drag.normal
    const out = (hit.x - current.start[0]) * nx + (hit.z - current.start[1]) * nz
    const target = Math.round(out / WALL_SNAP)
    const step = reachableStep(current.room, current.drag, current.step, target)
    // Stopped by a door or window: say so (J.8).
    const direction = Math.sign(target - step)
    const blocked = direction && draggedRoom(current.room, current.drag, step + direction).problem === 'openings'
    useUiStore.getState().setBuildNotice(blocked ? BUILD_NOTICES.openings : null)
    if (step === current.step) return
    current.step = step
    useRoomStore.getState().setRoom(draggedRoom(current.room, current.drag, step).room)
    current.shown = useRoomStore.getState().room.corners
    // The selection follows the moved wall (gone once it is back in line).
    useUiStore.getState().selectWall(draggedWallEnds(current, step))
  }

  function handlePointerUp(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return
    event.target.releasePointerCapture(event.pointerId)
    stopDrag()
  }

  // A Room configuration field under the pointer lights up the walls it
  // changes (J.4.2), like a selected wall.
  const color =
    selected || highlighted
      ? BUILD_WALL_SELECTED_COLOR
      : hovered && !wallDragActive
        ? BUILD_WALL_HOVER_COLOR
        : BUILD_WALL_COLOR

  return (
    <>
      <mesh position={box.position}>
        <boxGeometry args={box.size} />
        <meshBasicMaterial color={color} />
      </mesh>
      {cuttingHere && cutAt !== null && <CutMark wall={wall} at={cutAt} />}
      <mesh
        position={box.position}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (!wallDragActive) hover(true)
        }}
        // While dragging the wall stays highlighted; after the release, the
        // next move that leaves it turns it back.
        onPointerOut={() => {
          setCutAt(null)
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

// The dragged wall's ends at `step`, as a selection.
function draggedWallEnds(current, step) {
  const { corners, index } = current.drag
  const [nx, nz] = current.drag.normal
  const offset = step * WALL_SNAP
  const shift = (corner) => ({ x: corner.x + nx * offset + 0, z: corner.z + nz * offset + 0 })
  return { a: shift(corners[index]), b: shift(corners[(index + 1) % corners.length]) }
}

// Where a cut would go (J.7.1): a line across the wall `at` meters from its
// start, and the distance to each end.
function CutMark({ wall, at }) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const out = BUILD_WALL_THICKNESS / 2
  const alongX = Math.abs(dz) < 1e-9
  const depth = BUILD_WALL_THICKNESS + 0.08
  return (
    <>
      <mesh position={[wall.start.x + dx * at + nx * out, WALL_DRAW_HEIGHT + 0.01, wall.start.z + dz * at + nz * out]}>
        <boxGeometry args={alongX ? [CUT_MARK_WIDTH, 0.01, depth] : [depth, 0.01, CUT_MARK_WIDTH]} />
        <meshBasicMaterial color={CUT_MARK_COLOR} />
      </mesh>
      <BuildDistances wall={wall} from={at} to={at} />
    </>
  )
}

// The Build view (J.5): the room from above, flat, with no light or shadow:
// the floor in its color, the walls dark, each wall's length next to it.
// Furniture is not shown. Walls can be selected and dragged (J.6), cut in
// two at a point (J.7.1), and get a door or window (J.8.1, J.8.2); the
// selected wall shows a bar with those tools (J.8.3), except while it is
// dragged or a tool is on. Esc turns the tool off, then clears the
// selection.
export default function BuildScene() {
  const { corners, openings } = useRoomStore((state) => state.room)
  const selection = useUiStore((state) => state.selectedWall)
  const tool = useUiStore((state) => state.tool)
  const highlightedWalls = useUiStore((state) => state.highlightedWalls)
  // Height: seen from above, a wall's top edge is the whole wall.
  const highlightedTop = useUiStore((state) => state.highlightedTop)
  const walls = wallBoxes(corners, WALL_DRAW_HEIGHT, BUILD_WALL_THICKNESS)
  const selectedIndex = selection ? findWall(corners, selection.a, selection.b) : -1
  // A wall is being dragged (J.8.3: the bar hides meanwhile).
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      // A field being typed in keeps Esc; a focused button (Cut) does not.
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      const ui = useUiStore.getState()
      // Delete or Backspace removes the selected door or window (J.8), only
      // with the focus on the page or the view.
      const { room, removeOpening } = useRoomStore.getState()
      const opening = room.openings?.find((item) => item.id === ui.selectedOpening)
      if ((event.key === 'Delete' || event.key === 'Backspace') && opening && focusIsFree()) {
        event.preventDefault()
        removeOpening(opening.id)
        ui.selectOpening(null)
        return
      }
      if (event.key !== 'Escape' || typing) return
      if (ui.tool) ui.setTool(null)
      else if (ui.selectedWall) ui.selectWall(null)
      else if (ui.selectedOpening) ui.selectOpening(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // A selected wall that no longer exists (undo, New, Open, merged back in
  // line) is let go, so it does not come back later by chance.
  // The same for a door or window that is gone (J.8).
  useEffect(() => {
    const { selectedWall, selectWall, selectedOpening, selectOpening } = useUiStore.getState()
    const { room } = useRoomStore.getState()
    if (selectedOpening && !room.openings?.some((opening) => opening.id === selectedOpening)) selectOpening(null)
    if (!selectedWall || wallDragActive) return
    if (findWall(room.corners, selectedWall.a, selectedWall.b) === -1) selectWall(null)
  }, [corners, openings, selection])

  return (
    <>
      <Floor flat />
      {walls.map((box, index) => (
        <BuildWall
          key={index}
          index={index}
          box={box}
          selected={index === selectedIndex}
          highlighted={highlightedTop || highlightedWalls.includes(index)}
          cutting={tool === 'cut'}
          onDragChange={setDragging}
        />
      ))}
      {walls.map((box, index) => (
        <WallLength key={index} wall={box.wall} />
      ))}
      <BuildOpenings thickness={BUILD_WALL_THICKNESS} />
      {selectedIndex !== -1 && !tool && !dragging && <WallBar wall={walls[selectedIndex].wall} />}
      {(tool === 'door' || tool === 'window') && (
        <PlaceOpening key={tool} type={tool} thickness={BUILD_WALL_THICKNESS} />
      )}
    </>
  )
}
