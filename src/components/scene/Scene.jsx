import Floor from './Floor'
import Walls from './Walls'
import Openings from './Openings'
import Objects from './Objects'
import ObjectNames from './ObjectNames'
import SelectionBox from './SelectionBox'
import OpeningOutline from './OpeningOutline'
import OpeningDistances from './OpeningDistances'
import ObjectWidget from './ObjectWidget'
import MoveReadout from './MoveReadout'
import WallDistances from './WallDistances'
import { useUiStore } from '../../store/uiStore'

// The 2D view's only light (J.1.3): even from every side, at the strength
// that shows each color as it is, so nothing is shaded and nothing casts a
// shadow, like Build.
const FLAT_LIGHT = Math.PI

export default function Scene() {
  // Walk is for looking only (J.1.2): no selection, widget or measurements.
  const editing = useUiStore((state) => state.sceneView !== 'walk')
  const flat = useUiStore((state) => state.sceneView === '2d')

  return (
    <>
      {/* The room's lights, with shading and shadows: 3D, Walk and every Room
          render. In 2D they are off and the flat light is on; a Room render
          taken from there swaps them for its one frame (roomRenderView.js). */}
      <ambientLight intensity={0.5} visible={!flat} userData={{ roomLight: true }} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow visible={!flat} userData={{ roomLight: true }} />
      <ambientLight intensity={FLAT_LIGHT} visible={flat} userData={{ flatLight: true }} />
      <Floor />
      <Walls />
      <Openings />
      <Objects />
      {flat && <ObjectNames />}
      {editing && (
        <>
          <SelectionBox />
          <OpeningOutline />
          <OpeningDistances />
          <WallDistances />
          <ObjectWidget />
          <MoveReadout />
        </>
      )}
    </>
  )
}
