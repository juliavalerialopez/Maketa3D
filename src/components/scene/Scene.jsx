import Floor from './Floor'
import Walls from './Walls'
import Openings from './Openings'
import Objects from './Objects'
import ObjectNames from './ObjectNames'
import OpeningMarks from './OpeningMarks'
import RoomDimensions from './RoomDimensions'
import SelectionBox from './SelectionBox'
import OpeningOutline from './OpeningOutline'
import OpeningDistances from './OpeningDistances'
import ObjectWidget from './ObjectWidget'
import MoveReadout from './MoveReadout'
import WallDistances from './WallDistances'
import PlaceOpening from './PlaceOpening'
import { useLayoutEffect, useRef } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { shadowBounds } from './shadowBounds'

// The 2D view's only light (J.1.3): even from every side, at the strength
// that shows each color as it is, so nothing is shaded and nothing casts a
// shadow, like Build.
const FLAT_LIGHT = Math.PI
// How far outside the room's back and left edges the 2D view's dimension lines
// start (J.5.3), past the thin walls.
const DIMENSION_GAP_2D = 0.5

// The room's sun. Its shadow box and map follow the room's size, so a large
// room keeps its shadows.
function Sun({ visible }) {
  const light = useRef(null)
  const corners = useRoomStore((state) => state.room.corners)
  const { reach, mapSize } = shadowBounds(corners)

  useLayoutEffect(() => {
    const { shadow } = light.current
    const camera = shadow.camera
    camera.left = -reach
    camera.right = reach
    camera.top = reach
    camera.bottom = -reach
    camera.updateProjectionMatrix()
    if (shadow.mapSize.x !== mapSize) {
      shadow.mapSize.set(mapSize, mapSize)
      shadow.map?.dispose()
      shadow.map = null
    }
  }, [reach, mapSize])

  return <directionalLight ref={light} position={[5, 10, 5]} intensity={1} castShadow visible={visible} userData={{ roomLight: true }} />
}

export default function Scene() {
  // Walk is for looking only (J.1.2): no selection, widget or measurements.
  const editing = useUiStore((state) => state.sceneView !== 'walk')
  const flat = useUiStore((state) => state.sceneView === '2d')
  const sceneView = useUiStore((state) => state.sceneView)
  const tool = useUiStore((state) => state.tool)

  return (
    <>
      {/* The room's lights, with shading and shadows: 3D, Walk and every Room
          render. In 2D they are off and the flat light is on; a Room render
          taken from there swaps them for its one frame (roomRenderView.js). */}
      <ambientLight intensity={0.5} visible={!flat} userData={{ roomLight: true }} />
      <Sun visible={!flat} />
      <ambientLight intensity={FLAT_LIGHT} visible={flat} userData={{ flatLight: true }} />
      <Floor />
      <Walls />
      <Openings />
      <Objects />
      {flat && <ObjectNames />}
      {flat && <OpeningMarks />}
      {flat && <RoomDimensions gap={DIMENSION_GAP_2D} />}
      {editing && (
        <>
          <SelectionBox />
          <OpeningOutline />
          <OpeningDistances />
          <WallDistances />
          <ObjectWidget />
          <MoveReadout />
          {(tool === 'door' || tool === 'window') && <PlaceOpening key={tool} type={tool} view={sceneView} />}
        </>
      )}
    </>
  )
}
