import { useEffect, useState } from 'react'
import { Plane, Vector3 } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { nearestWall, openingStart, placedOpening, spannedOpening } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { OpeningSymbol, SELECTED_FILL } from './BuildOpenings'
import BuildDistances from './BuildDistances'
import { WallLayers, WallPreview } from './PlaceOpening3D'
import { WALL_THICKNESS } from './wallBoxes'
import { PLAN_BAND } from './wallStrip'

// Where it cannot go: a muted red, the same in both themes like the walls.
const BLOCKED_FILL = '#c9665a'
// How near a wall the pointer must be for the preview to show, in meters.
const PLACE_REACH = 1
// A press that moved more than this many pixels was a pan, not a click.
const CLICK_SLOP = 4
// The invisible layer that takes the pointer sits above walls and openings,
// so they ignore it meanwhile; the preview just above the openings.
const LAYER_Y = 0.3
const PREVIEW_LIFT = 0.01
const LAYER_SIZE = 200
// In Plan's 2D view the layer is above the furniture and the walls' top.
const LAYER_ABOVE_ROOM = 5
// The mark where a window would start: a line across the wall.
const MARK_WIDTH = 0.05
const MARK_OVERHANG = 0.08

const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

// How far along `wall` the floor point (x, z) is, from its start.
function alongWall(wall, x, z) {
  return ((x - wall.start.x) * (wall.end.x - wall.start.x) + (z - wall.start.z) * (wall.end.z - wall.start.z)) / wall.length
}

// What a click at `along` on wall `wallIndex` would do (null when a window's
// second click is on another wall than its first):
// - a door (J.8.1), or a window once its start is set (J.8.2): { opening,
//   problem }, the new one;
// - a window's first click: { point: { wallIndex, along, problem } }.
function previewOnWall(room, type, start, wallIndex, along) {
  if (type === 'window' && start) {
    return wallIndex === start.wallIndex ? spannedOpening(room, type, wallIndex, start.along, along) : null
  }
  if (type === 'door') return placedOpening(room, type, wallIndex, along)
  return { point: openingStart(room, wallIndex, along) }
}

// What a click at `aim` would do, or null. `aim` is a floor point { x, z }
// (Build and Plan's 2D view: the nearest wall within reach; a window's second
// click stays on the wall of its first) or a point on a wall { wallIndex,
// along } (Plan's 3D view).
function previewFor(room, type, start, aim) {
  if (aim.wallIndex !== undefined) return previewOnWall(room, type, start, aim.wallIndex, aim.along)
  if (type === 'window' && start) {
    const wall = roomWalls(room.corners)[start.wallIndex]
    return wall ? spannedOpening(room, type, start.wallIndex, start.along, alongWall(wall, aim.x, aim.z)) : null
  }
  const near = nearestWall(room.corners, aim.x, aim.z, PLACE_REACH)
  return near ? previewOnWall(room, type, start, near.wallIndex, near.along) : null
}

// A line across `wall` at `along` meters, over the wall's whole thickness.
function PointMark({ wall, along, thickness, color }) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const out = thickness / 2
  const depth = thickness + MARK_OVERHANG
  const alongX = Math.abs(dz) < 1e-9
  return (
    <mesh position={[wall.start.x + dx * along + nx * out, 0.04, wall.start.z + dz * along + nz * out]}>
      <boxGeometry args={alongX ? [MARK_WIDTH, 0.01, depth] : [depth, 0.01, MARK_WIDTH]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

// The placing tools for a door or a window (J.8.1, J.8.2, J.9.4), in Build
// (`view` 'build', `thickness` its wall thickness), Plan's 2D view ('2d') and
// Plan's 3D view ('3d'). Red where it cannot go, and a click there does
// nothing. Dragging still pans or orbits the view.
// - Door: a new one follows the pointer on the nearest wall in 5 cm steps,
//   with its distance to the wall's ends; a click places it.
// - Window: a point follows the pointer on the nearest wall, with its
//   distance to the ends; a click sets where it starts. Then it stretches
//   from there to the pointer along that wall, with its width; a second
//   click sets where it ends and places it.
// A placed one is selected, which turns the tool off. In 3D the pointer is
// on a wall's inside face; elsewhere it is on the floor.
export default function PlaceOpening({ type, view = 'build', thickness = 0 }) {
  const room = useRoomStore((state) => state.room)
  // The pointer: a floor point { x, z } or a point on a wall { wallIndex,
  // along } (see previewFor), or null when it is off the view.
  const [aim, setAim] = useState(null)
  // A window's start once the first click set it: { wallIndex, along }.
  const [savedStart, setStart] = useState(null)
  // Its wall is gone (undo, New Project): it starts over.
  const start = savedStart && roomWalls(room.corners)[savedStart.wallIndex] ? savedStart : null
  if (savedStart && !start) setStart(null)

  const preview = aim ? previewFor(room, type, start, aim) : start && { point: { ...start, problem: null } }
  const problem = preview && (preview.point ?? preview).problem
  const cursor = !aim || !preview ? '' : problem ? 'not-allowed' : 'crosshair'

  useEffect(() => {
    document.body.style.cursor = cursor
  }, [cursor])
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  function place(at) {
    const next = previewFor(useRoomStore.getState().room, type, start, at)
    if (!next || (next.point ?? next).problem) return
    if (next.point) {
      setStart({ wallIndex: next.point.wallIndex, along: next.point.along })
      return
    }
    const result = useRoomStore.getState().addOpening(next.opening)
    if (result.problem) return
    useUiStore.getState().setBuildNotice(null)
    // Selecting it turns the tool off.
    useUiStore.getState().selectOpening(result.id)
  }

  function follow(event) {
    event.stopPropagation()
    if (event.ray.intersectPlane(FLOOR, hit)) setAim({ x: hit.x, z: hit.z })
  }

  function handleClick(event) {
    event.stopPropagation()
    if (event.delta > CLICK_SLOP || !event.ray.intersectPlane(FLOOR, hit)) return
    place({ x: hit.x, z: hit.z })
  }

  const walls = roomWalls(room.corners)
  const wallAim = (index, point) => ({ wallIndex: index, along: alongWall(walls[index], point.x, point.z) })
  const color = problem ? BLOCKED_FILL : SELECTED_FILL

  if (view === '3d') {
    return (
      <>
        <group userData={{ helper: true }}>
          <WallLayers
            walls={walls}
            height={room.height}
            onAim={(index, point) => setAim(wallAim(index, point))}
            onPick={(index, point, delta) => delta <= CLICK_SLOP && place(wallAim(index, point))}
            onLeave={() => setAim(null)}
          />
        </group>
        {preview && <WallPreview preview={preview} walls={walls} height={room.height} color={color} />}
        {preview && <Distances preview={preview} walls={walls} type={type} />}
      </>
    )
  }

  const flat2d = view === '2d'
  // In 2D the symbol is the wider one of the marks, over the walls' top.
  const symbol = flat2d
    ? { thickness: PLAN_BAND, across: -(PLAN_BAND - WALL_THICKNESS) / 2 }
    : { thickness, across: 0 }
  const markThickness = flat2d ? WALL_THICKNESS : thickness
  let shown = null
  if (preview?.point) {
    shown = (
      <>
        <PointMark wall={walls[preview.point.wallIndex]} along={preview.point.along} thickness={markThickness} color={color} />
        <Distances preview={preview} walls={walls} type={type} />
      </>
    )
  } else if (preview) {
    const { opening } = preview
    shown = (
      <>
        <OpeningSymbol opening={opening} wall={walls[opening.wallIndex]} color={color} {...symbol} />
        <Distances preview={preview} walls={walls} type={type} />
      </>
    )
  }

  return (
    <>
      <mesh
        position={[0, flat2d ? room.height + LAYER_ABOVE_ROOM : LAYER_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={follow}
        onPointerMove={follow}
        onPointerOut={() => setAim(null)}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={handleClick}
      >
        <planeGeometry args={[LAYER_SIZE, LAYER_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* A helper: never in a Room render. */}
      {shown && <group position={[0, (flat2d ? room.height : 0) + PREVIEW_LIFT, 0]} userData={{ helper: true }}>{shown}</group>}
    </>
  )
}

// The distances along the wall to the preview's edges (a window's start point
// shows its one distance, from both sides).
function Distances({ preview, walls, type }) {
  if (preview.point) {
    const wall = walls[preview.point.wallIndex]
    return <BuildDistances wall={wall} from={preview.point.along} to={preview.point.along} />
  }
  const { opening } = preview
  return (
    <BuildDistances
      wall={walls[opening.wallIndex]}
      from={opening.offset}
      to={opening.offset + opening.width}
      showWidth={type === 'window'}
    />
  )
}
