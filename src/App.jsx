import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './components/Scene'
import SplitLayout from './components/SplitLayout'

export default function App() {
  return (
    <SplitLayout>
      <Canvas camera={{ position: [4, 4, 4], fov: 50 }} shadows>
        <Scene />
        <OrbitControls />
      </Canvas>
    </SplitLayout>
  )
}
