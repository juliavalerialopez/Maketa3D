import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { WALL_SNAP, draggedRoom, reachableStep, startWallDrag, useRoomStore } from '../../store/roomStore'
import { MIN_CUT_WALL, cutPoint, findWall, splitWall } from '../../store/roomShape'
import { useObjectsStore } from '../../store/objectsStore'
import { BUILD_NOTICES, movedInsideNotice, useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import BuildDistances from './BuildDistances'
import { wallBoxes } from './wallBoxes'
import {
  BUILD_WALL_THICKNESS,
  WALL_DRAW_HEIGHT,
  isWallDragActive,
  setWallDragActive,
  useStaleSelection,
} from './wallEditing'

// The colors are the same in both themes, like the floor.
const BUILD_WALL_COLOR = '#4a463f'
// The selected wall (J.7): warm clay; a hovered one (J.6): a lighter clay.
const SELECTED_COLOR = '#b5653d'
const HOVER_COLOR = '#c98a63'
// Where a cut would go (J.7.1): a pale sand line across the wall, with its
// distance to each end inside the room.
const CUT_MARK_COLOR = '#f1e3c6'
const CUT_MARK_WIDTH = 0.04
// How wide the invisible strip to grab a wall is, in meters.
const WALL_GRAB = 0.4
// Drags happen on the floor.
const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

const wallSelection = (wall) => ({ a: { ...wall.start }, b: { ...wall.end } })

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
//
// Build draws the wall itself (`drawn`); Plan's 2D view has its walls already,
// so there the wall shows a clay box only while it is hovered or selected
// (`overlayY`, a helper), and the grab strip lies on the floor (`stripY`, thin)
// so furniture and doors and windows above it get the press first. In Plan,
// pieces left outside the walls when a drag ends are pushed inside
// (`fitFurniture`), in the same undo step.
export function EditableWall({
  index,
  box,
  selected,
  highlighted,
  cutting,
  onDragChange,
  drawn = true,
  overlayY = box.position[1],
  stripY = box.position[1],
  stripHeight = 0.1,
  fitFurniture = false,
}) {
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

  // Ends the drag: pieces left outside are pushed in (Plan), its undo step
  // closes and pan comes back. A wall merged back in line is no longer
  // selected.
  function stopDrag() {
    dragRef.current = null
    setWallDragActive(false)
    onDragChange(false)
    if (fitFurniture) {
      const moved = useObjectsStore.getState().fitToRoom(useRoomStore.getState().room)
      useUiStore.getState().setRoomNotice(movedInsideNotice(moved))
    }
    endGesture()
    setControls(true)
    const { selectedWall, selectWall } = useUiStore.getState()
    if (selectedWall && findWall(useRoomStore.getState().room.corners, selectedWall.a, selectedWall.b) === -1) {
      selectWall(null)
    }
  }

  // Removed mid-drag or while under the pointer (e.g. leaving the view): the
  // drag ends and the cursor comes back.
  useEffect(
    () => () => {
      if (hoveredRef.current) document.body.style.cursor = ''
      if (!dragRef.current) return
      dragRef.current = null
      setWallDragActive(false)
      onDragChange(false)
      endGesture()
      const { controls } = getThree()
      if (controls) controls.enabled = true
    },
    [getThree, onDragChange],
  )

  function handlePointerDown(event) {
    if (event.button !== 0 || isWallDragActive()) return
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
    // A wall, a piece of furniture and an opening are never selected together.
    useObjectsStore.getState().selectObject(null)
    ui.selectWall(wallSelection(wall))
    dragRef.current = {
      pointerId: event.pointerId,
      room,
      drag: startWallDrag(room, index),
      start: [hit.x, hit.z],
      step: 0,
      shown: room.corners,
    }
    setWallDragActive(true)
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
      ? SELECTED_COLOR
      : hovered && !isWallDragActive()
        ? HOVER_COLOR
        : BUILD_WALL_COLOR
  const showBox = drawn || selected || highlighted || (hovered && !isWallDragActive())
  const [x, , z] = box.position

  return (
    <>
      {showBox && (
        <mesh position={[x, overlayY, z]} userData={drawn ? undefined : { helper: true }}>
          <boxGeometry args={box.size} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      {cuttingHere && cutAt !== null && <CutMark wall={wall} at={cutAt} y={overlayY} />}
      <mesh
        position={[x, stripY, z]}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (!isWallDragActive()) hover(true)
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
        <boxGeometry args={alongX ? [box.size[0], stripHeight, WALL_GRAB] : [WALL_GRAB, stripHeight, box.size[2]]} />
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
function CutMark({ wall, at, y }) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const out = BUILD_WALL_THICKNESS / 2
  const alongX = Math.abs(dz) < 1e-9
  const depth = BUILD_WALL_THICKNESS + 0.08
  return (
    <>
      <mesh position={[wall.start.x + dx * at + nx * out, y + 0.01, wall.start.z + dz * at + nz * out]}>
        <boxGeometry args={alongX ? [CUT_MARK_WIDTH, 0.01, depth] : [depth, 0.01, CUT_MARK_WIDTH]} />
        <meshBasicMaterial color={CUT_MARK_COLOR} />
      </mesh>
      <BuildDistances wall={wall} from={at} to={at} />
    </>
  )
}

// The walls of Plan's 2D view that can be selected and dragged (K.1.15): the
// walls themselves are drawn by Walls.jsx, so each shows a clay box only while
// it is hovered or selected, and the strips to grab them lie on the floor,
// under the furniture and the doors and windows. While a door or window
// placing tool is on, a press is for placing: no strips then.
export default function WallEditor() {
  const { corners, openings, height } = useRoomStore((state) => state.room)
  const selection = useUiStore((state) => state.selectedWall)
  const tool = useUiStore((state) => state.tool)
  const walls = wallBoxes(corners, WALL_DRAW_HEIGHT, BUILD_WALL_THICKNESS)
  const selectedIndex = selection ? findWall(corners, selection.a, selection.b) : -1
  useStaleSelection(corners, openings, selection)

  if (tool === 'door' || tool === 'window') return null
  return walls.map((box, index) => (
    <EditableWall
      key={index}
      index={index}
      box={box}
      selected={index === selectedIndex}
      highlighted={false}
      cutting={tool === 'cut'}
      onDragChange={noop}
      drawn={false}
      overlayY={height + 0.03}
      stripY={0.015}
      stripHeight={0.01}
      fitFurniture
    />
  ))
}

const noop = () => {}
