import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './components/scene/Scene'
import SplitLayout from './components/layout/SplitLayout'
import ControlPanel from './components/panel/ControlPanel'

export default function App() {
  return (
    <SplitLayout panel={<ControlPanel />}>
      <Canvas camera={{ position: [4, 4, 4], fov: 50 }} shadows>
        <Scene />
        <OrbitControls />
      </Canvas>
    </SplitLayout>
  )
}
