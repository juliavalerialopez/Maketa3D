import Floor from './Floor'
import Walls from './Walls'

export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Floor />
      <Walls />
    </>
  )
}
