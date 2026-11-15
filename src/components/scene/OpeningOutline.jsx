import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, EdgesGeometry } from 'three'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { openingsOf } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { showWallFor } from './wallVisibility'
import { openingPlacement } from './openingPlacement'
import { themeColor } from './themeColor'

const PADDING = 0.02
// How deep the outline is, out from the wall into the room: enough to show
// as a thin strip in the 2D view, from above.
const DEPTH = 0.1

// A thin box outline around the selected door or window in Plan (J.9.1), in
// the selection color, like the selected furniture's. A helper, so it is
// hidden in the Room render; it hides with its wall when the camera is
// outside it.
export default function OpeningOutline() {
  const room = useRoomStore((state) => state.room)
  const selectedId = useUiStore((state) => state.selectedOpening)
  const color = themeColor('--selection', useUiStore((state) => state.theme))
  const groupRef = useRef(null)
  const opening = openingsOf(room).find((item) => item.id === selectedId)
  const wall = opening && roomWalls(room.corners)[opening.wallIndex]
  // Its size as plain numbers, so the outline is rebuilt only when it changes.
  const width = useRoomStore((state) => openingsOf(state.room).find((item) => item.id === selectedId)?.width)
  const height = useRoomStore((state) => openingsOf(state.room).find((item) => item.id === selectedId)?.height)

  const geometry = useMemo(() => {
    if (width === undefined) return null
    const box = new BoxGeometry(width + 2 * PADDING, height + 2 * PADDING, DEPTH)
    const edges = new EdgesGeometry(box)
    box.dispose()
    return edges
  }, [width, height])

  useEffect(() => () => geometry?.dispose(), [geometry])

  useFrame(({ camera }) => {
    if (groupRef.current) showWallFor(groupRef.current, camera)
  })

  if (!wall) return null
  const { position, turn } = openingPlacement(wall, opening, DEPTH / 2)
  return (
    // The helper flag on its own group: the Room render shows or hides
    // whatever has a wallNormal after hiding helpers, which must not show this.
    <group userData={{ helper: true }}>
      <group
        ref={groupRef}
        position={position}
        rotation={[0, turn, 0]}
        userData={{ wallNormal: [wall.normal[0], 0, wall.normal[1]] }}
      >
        <lineSegments geometry={geometry}>
          <lineBasicMaterial color={color} />
        </lineSegments>
      </group>
    </group>
  )
}
