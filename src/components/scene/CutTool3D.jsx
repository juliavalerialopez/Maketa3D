import { useEffect, useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { cutPoint, roomWalls, splitWall } from '../../store/roomShape'
import { BUILD_NOTICES, useUiStore } from '../../store/uiStore'
import BuildDistances from './BuildDistances'
import { WallLayers, WallPreview } from './PlaceOpening3D'

// The mark of the cut, like Build's pale sand line.
const CUT_COLOR = '#f1e3c6'
// A press that moved more than this many pixels was an orbit, not a click.
const CLICK_SLOP = 4

// How far along `wall` the point (x, z) on it is, from its start.
function alongWall(wall, x, z) {
  return ((x - wall.start.x) * (wall.end.x - wall.start.x) + (z - wall.start.z) * (wall.end.z - wall.start.z)) / wall.length
}

// The Cut tool in Plan's 3D view (K.1.16): the pointer is on a wall's inside
// face, a pale strip shows where the cut would go (in 5 cm steps, at least
// 0.5 m from each end) with its distance to both ends, and a click splits the
// wall in two there, as in 2D. A wall under 1 m cannot be cut; a cut through a
// door or window is refused with the message and the tool stays on. A cut
// turns the tool off (selecting nothing lets the tool go). Dragging still
// orbits the view.
export default function CutTool3D() {
  const room = useRoomStore((state) => state.room)
  // Where the pointer is: { wallIndex, along } on a wall, or null.
  const [aim, setAim] = useState(null)
  const walls = roomWalls(room.corners)
  const wall = aim && walls[aim.wallIndex]
  const at = wall ? cutPoint(room.corners, aim.wallIndex, aim.along) : null

  // The pointer shows whether a cut is possible where it is.
  useEffect(() => {
    document.body.style.cursor = !aim ? '' : at === null ? 'not-allowed' : 'crosshair'
  }, [aim, at])
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  function cut(index, point) {
    const current = useRoomStore.getState().room
    const target = roomWalls(current.corners)[index]
    if (!target) return
    const corners = splitWall(current.corners, index, alongWall(target, point.x, point.z))
    const ui = useUiStore.getState()
    ui.setBuildNotice(null)
    const problem = corners ? useRoomStore.getState().setCorners(corners) : 'shape'
    if (problem === 'openings') {
      ui.setBuildNotice(BUILD_NOTICES.cut)
      return
    }
    if (problem) return
    // Nothing selected, which turns the tool off.
    ui.selectWall(null)
    setAim(null)
  }

  const aimAt = (index, point) => setAim({ wallIndex: index, along: alongWall(walls[index], point.x, point.z) })

  return (
    <>
      <group userData={{ helper: true }}>
        <WallLayers
          walls={walls}
          height={room.height}
          onAim={aimAt}
          onPick={(index, point, delta) => delta <= CLICK_SLOP && cut(index, point)}
          onLeave={() => setAim(null)}
        />
      </group>
      {at !== null && (
        <>
          <WallPreview preview={{ point: { wallIndex: aim.wallIndex, along: at } }} walls={walls} height={room.height} color={CUT_COLOR} />
          <BuildDistances wall={wall} from={at} to={at} />
        </>
      )}
    </>
  )
}
