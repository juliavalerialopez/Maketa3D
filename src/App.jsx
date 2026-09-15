import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './components/Scene'

export default function App() {
  return (
    <Canvas camera={{ position: [4, 4, 4], fov: 50 }} shadows>
      <Scene />
      <OrbitControls />
    </Canvas>
  )
}
