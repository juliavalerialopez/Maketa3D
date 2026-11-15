import { useEffect, useState } from 'react'
import { Plane, Vector3 } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { nearestWall, openingStart, placedOpening, spannedOpening } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { OpeningSymbol, SELECTED_FILL } from './BuildOpenings'
import BuildDistances from './BuildDistances'

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
// The mark where a window would start: a line across the wall.
const MARK_WIDTH = 0.05
const MARK_OVERHANG = 0.08

const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

// How far along `wall` the floor point (x, z) is, from its start.
function alongWall(wall, x, z) {
  return ((x - wall.start.x) * (wall.end.x - wall.start.x) + (z - wall.start.z) * (wall.end.z - wall.start.z)) / wall.length
}

// What a click at the floor point (x, z) would do:
// - a door (J.8.1), or a window once its start is set (J.8.2): { opening,
//   problem }, the new one;
// - a window's first click: { point: { wallIndex, along, problem } };
// - null when the pointer is too far from any wall.
// A window's second click stays on the wall of its first.
function previewAt(room, type, start, x, z) {
  if (type === 'window' && start) {
    const wall = roomWalls(room.corners)[start.wallIndex]
    return wall ? spannedOpening(room, type, start.wallIndex, start.along, alongWall(wall, x, z)) : null
  }
  const near = nearestWall(room.corners, x, z, PLACE_REACH)
  if (!near) return null
  if (type === 'door') return placedOpening(room, type, near.wallIndex, near.along)
  return { point: openingStart(room, near.wallIndex, near.along) }
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

// Build's placing tools for a door or a window (J.8.1, J.8.2). Red where it
// cannot go, and a click there does nothing. Dragging still pans the view.
// - Door: a new one follows the pointer on the nearest wall in 5 cm steps,
//   with its distance to the wall's ends; a click places it.
// - Window: a point follows the pointer on the nearest wall, with its
//   distance to the ends; a click sets where it starts. Then it stretches
//   from there to the pointer along that wall, with its width; a second
//   click sets where it ends and places it.
// A placed one is selected, which turns the tool off.
export default function PlaceOpening({ type, thickness }) {
  const room = useRoomStore((state) => state.room)
  // The pointer on the floor, [x, z], or null when it is off the view.
  const [pointer, setPointer] = useState(null)
  // A window's start once the first click set it: { wallIndex, along }.
  const [savedStart, setStart] = useState(null)
  // Its wall is gone (undo, New Project): it starts over.
  const start = savedStart && roomWalls(room.corners)[savedStart.wallIndex] ? savedStart : null
  if (savedStart && !start) setStart(null)

  const preview = pointer
    ? previewAt(room, type, start, pointer[0], pointer[1])
    : start && { point: { ...start, problem: null } }
  const problem = preview && (preview.point ?? preview).problem
  const cursor = !pointer || !preview ? '' : problem ? 'not-allowed' : 'crosshair'

  useEffect(() => {
    document.body.style.cursor = cursor
  }, [cursor])
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  function follow(event) {
    event.stopPropagation()
    if (event.ray.intersectPlane(FLOOR, hit)) setPointer([hit.x, hit.z])
  }

  function handleClick(event) {
    event.stopPropagation()
    if (event.delta > CLICK_SLOP || !event.ray.intersectPlane(FLOOR, hit)) return
    const next = previewAt(useRoomStore.getState().room, type, start, hit.x, hit.z)
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

  const color = problem ? BLOCKED_FILL : SELECTED_FILL
  const walls = roomWalls(room.corners)
  let shown = null
  if (preview?.point) {
    const wall = walls[preview.point.wallIndex]
    const { along } = preview.point
    shown = (
      <>
        <PointMark wall={wall} along={along} thickness={thickness} color={color} />
        <BuildDistances wall={wall} from={along} to={along} />
      </>
    )
  } else if (preview) {
    const { opening } = preview
    const wall = walls[opening.wallIndex]
    shown = (
      <>
        <OpeningSymbol opening={opening} wall={wall} thickness={thickness} color={color} />
        <BuildDistances
          wall={wall}
          from={opening.offset}
          to={opening.offset + opening.width}
          showWidth={type === 'window'}
        />
      </>
    )
  }

  return (
    <>
      <mesh
        position={[0, LAYER_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={follow}
        onPointerMove={follow}
        onPointerOut={() => setPointer(null)}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={handleClick}
      >
        <planeGeometry args={[LAYER_SIZE, LAYER_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {shown && <group position={[0, PREVIEW_LIFT, 0]}>{shown}</group>}
    </>
  )
}
