import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { WALL_SNAP, draggedRoom, reachableStep, startWallDrag, useRoomStore } from '../../store/roomStore'
import { cutSpan, cutWall, findWall } from '../../store/roomShape'
import { BUILD_NOTICES, useUiStore } from '../../store/uiStore'
import BuildOpenings from './BuildOpenings'
import { focusIsFree } from '../panel/useObjectShortcuts'
import { beginGesture, endGesture } from '../../store/historyStore'
import WallLengthField from '../panel/WallLengthField'
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
// Where a cut would go (J.7): pale sand over the selected wall.
const CUT_PREVIEW_COLOR = '#f1e3c6'
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

// A wall's length at its middle just outside the room (J.5).
function WallLength({ index, wall }) {
  const [mx, mz] = [(wall.start.x + wall.end.x) / 2, (wall.start.z + wall.end.z) / 2]
  const gap = BUILD_WALL_THICKNESS + LABEL_GAP
  return (
    <Html position={[mx + wall.normal[0] * gap, 0, mz + wall.normal[1] * gap]} center>
      <div className="wall-length">
        <WallLengthField compact index={index} wall={wall} />
      </div>
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
// - With Cut on, a press on the selected wall cuts a piece out there, shown
//   while hovering (J.7).
function BuildWall({ index, box, selected, highlighted, cutting }) {
  const getThree = useThree((state) => state.get)
  const [hovered, setHovered] = useState(false)
  const hoveredRef = useRef(false)
  // Where a cut would go, [from, to] along the wall, while hovering with Cut on.
  const [cutPreview, setCutPreview] = useState(null)
  // Active drag: { pointerId, room (before the drag), drag (startWallDrag),
  // start: [x, z], step, shown (the corners this drag set last) }. The walls
  // may be renumbered meanwhile, so it keeps all it needs.
  const dragRef = useRef(null)
  const { wall } = box
  const alongX = Math.abs(wall.end.z - wall.start.z) < 1e-9
  const cuttingHere = cutting && selected
  // With Cut off, no old preview is kept for the next time it is on.
  if (!cuttingHere && cutPreview) setCutPreview(null)

  function setControls(enabled) {
    const { controls } = getThree()
    if (controls) controls.enabled = enabled
  }

  function hover(on) {
    hoveredRef.current = on
    setHovered(on)
    document.body.style.cursor = on ? (cuttingHere ? 'crosshair' : alongX ? 'ns-resize' : 'ew-resize') : ''
  }

  // Ends the drag: its undo step closes and pan comes back. A wall merged
  // back in line is no longer selected.
  function stopDrag() {
    dragRef.current = null
    wallDragActive = false
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
    const { room } = useRoomStore.getState()
    const ui = useUiStore.getState()
    ui.setBuildNotice(null)
    if (cuttingHere) {
      // The new piece is selected, ready to be dragged. A cut through a door
      // or window is refused.
      const cut = cutWall(room.corners, index, alongWall(wall, hit.x, hit.z))
      const problem = cut ? useRoomStore.getState().setCorners(cut.corners) : 'shape'
      if (!problem) ui.selectWall(wallSelection(pieceOf(cut)))
      else if (problem === 'openings') ui.setBuildNotice(BUILD_NOTICES.cut)
      setCutPreview(null)
      // Cut is off again: the pointer shows the wall can be dragged.
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
    beginGesture()
    event.target.setPointerCapture(event.pointerId)
    setControls(false)
  }

  function handlePointerMove(event) {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) {
      if (cuttingHere && event.ray.intersectPlane(FLOOR, hit)) {
        setCutPreview(cutSpan(useRoomStore.getState().room.corners, index, alongWall(wall, hit.x, hit.z)))
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
      {cuttingHere && cutPreview && <CutPreview box={box} span={cutPreview} />}
      <mesh
        position={box.position}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (!wallDragActive) hover(true)
        }}
        // While dragging the wall stays highlighted; after the release, the
        // next move that leaves it turns it back.
        onPointerOut={() => {
          setCutPreview(null)
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

// The new piece of a cut (cutWall's result) as a selection.
function pieceOf(cut) {
  const next = cut.corners[(cut.index + 1) % cut.corners.length]
  return { start: cut.corners[cut.index], end: next }
}

// The dragged wall's ends at `step`, as a selection.
function draggedWallEnds(current, step) {
  const { corners, index } = current.drag
  const [nx, nz] = current.drag.normal
  const offset = step * WALL_SNAP
  const shift = (corner) => ({ x: corner.x + nx * offset + 0, z: corner.z + nz * offset + 0 })
  return { a: shift(corners[index]), b: shift(corners[(index + 1) % corners.length]) }
}

// Where a cut would go on the selected wall: a pale band over the wall.
function CutPreview({ box, span }) {
  const { wall } = box
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const middle = (span[0] + span[1]) / 2
  const length = span[1] - span[0]
  const out = BUILD_WALL_THICKNESS / 2
  const x = wall.start.x + dx * middle + wall.normal[0] * out
  const z = wall.start.z + dz * middle + wall.normal[1] * out
  const alongX = Math.abs(dz) < 1e-9
  return (
    <mesh position={[x, WALL_DRAW_HEIGHT + 0.01, z]}>
      <boxGeometry args={alongX ? [length, 0.01, BUILD_WALL_THICKNESS] : [BUILD_WALL_THICKNESS, 0.01, length]} />
      <meshBasicMaterial color={CUT_PREVIEW_COLOR} />
    </mesh>
  )
}

// The Build view (J.5): the room from above, flat, with no light or shadow:
// the floor in its color, the walls dark, each wall's length next to it.
// Furniture is not shown. Walls can be selected and dragged (J.6), and cut
// (J.7). Esc stops cutting, then clears the selection.
export default function BuildScene() {
  const { corners, openings } = useRoomStore((state) => state.room)
  const selection = useUiStore((state) => state.selectedWall)
  const cutting = useUiStore((state) => state.cutting)
  const highlightedWalls = useUiStore((state) => state.highlightedWalls)
  // Height: seen from above, a wall's top edge is the whole wall.
  const highlightedTop = useUiStore((state) => state.highlightedTop)
  const walls = wallBoxes(corners, WALL_DRAW_HEIGHT, BUILD_WALL_THICKNESS)
  const selectedIndex = selection ? findWall(corners, selection.a, selection.b) : -1

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
      if (ui.cutting) ui.setCutting(false)
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
          cutting={cutting}
        />
      ))}
      {walls.map((box, index) => (
        <WallLength key={index} index={index} wall={box.wall} />
      ))}
      <BuildOpenings thickness={BUILD_WALL_THICKNESS} />
    </>
  )
}
