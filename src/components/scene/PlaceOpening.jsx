import { useEffect, useState } from 'react'
import { Plane, Vector3 } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { nearestWall, placedOpening } from '../../store/openings'
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

const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

// Build's placing tool for a door (J.8.1): a preview of a new one follows the
// pointer on the nearest wall in 5 cm steps, with its distance to the wall's
// ends; red where it cannot go. A click places it, selected, and the tool
// turns off. Dragging still pans the view.
export default function PlaceOpening({ type, thickness }) {
  const room = useRoomStore((state) => state.room)
  // The pointer on the floor, [x, z], or null when it is off the view.
  const [pointer, setPointer] = useState(null)
  const near = pointer && nearestWall(room.corners, pointer[0], pointer[1], PLACE_REACH)
  const placed = near && placedOpening(room, type, near.wallIndex, near.along)
  const cursor = !placed ? '' : placed.problem ? 'not-allowed' : 'crosshair'

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
    const { room: current, placeOpening } = useRoomStore.getState()
    const target = nearestWall(current.corners, hit.x, hit.z, PLACE_REACH)
    if (!target) return
    const result = placeOpening(type, target.wallIndex, target.along)
    if (result.problem) return
    useUiStore.getState().setBuildNotice(null)
    // Selecting it turns the tool off.
    useUiStore.getState().selectOpening(result.id)
  }

  const wall = placed && roomWalls(room.corners)[placed.opening.wallIndex]
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
      {placed && (
        <group position={[0, PREVIEW_LIFT, 0]}>
          <OpeningSymbol
            opening={placed.opening}
            wall={wall}
            thickness={thickness}
            color={placed.problem ? BLOCKED_FILL : SELECTED_FILL}
          />
          <BuildDistances
            wall={wall}
            from={placed.opening.offset}
            to={placed.opening.offset + placed.opening.width}
          />
        </group>
      )}
    </>
  )
}
