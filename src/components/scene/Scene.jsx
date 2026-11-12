import Floor from './Floor'
import Walls from './Walls'
import Objects from './Objects'
import SelectionBox from './SelectionBox'
import ObjectWidget from './ObjectWidget'
import MoveReadout from './MoveReadout'
import WallDistances from './WallDistances'
import { useUiStore } from '../../store/uiStore'

export default function Scene() {
  // Walk is for looking only (J.1.2): no selection, widget or measurements.
  const editing = useUiStore((state) => state.sceneView !== 'walk')

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Floor />
      <Walls />
      <Objects />
      {editing && (
        <>
          <SelectionBox />
          <WallDistances />
          <ObjectWidget />
          <MoveReadout />
        </>
      )}
    </>
  )
}
