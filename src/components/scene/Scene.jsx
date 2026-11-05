import Floor from './Floor'
import Walls from './Walls'
import Objects from './Objects'
import SelectionBox from './SelectionBox'
import ObjectWidget from './ObjectWidget'
import PlaceableCamera from './PlaceableCamera'

export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Floor />
      <Walls />
      <Objects />
      <PlaceableCamera />
      <SelectionBox />
      <ObjectWidget />
    </>
  )
}
