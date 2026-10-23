import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './components/scene/Scene'
import SplitLayout from './components/layout/SplitLayout'
import ControlPanel from './components/panel/ControlPanel'
import { useObjectsStore } from './store/objectsStore'
import { isWidgetActive } from './components/scene/widgetState'

// A click that hits no object (empty floor, walls, outside the room) deselects.
// Fiber only calls this for real clicks, not for orbit drags. Floor and walls
// have no pointer handlers, so they never count as hits. Widget handles aren't
// hits either, so a click on a handle is ignored here.
function handlePointerMissed() {
  if (isWidgetActive()) return
  useObjectsStore.getState().selectObject(null)
}

export default function App() {
  return (
    <SplitLayout panel={<ControlPanel />}>
      <Canvas camera={{ position: [4, 4, 4], fov: 50 }} shadows onPointerMissed={handlePointerMissed}>
        <Scene />
        {/* Default controls, so dragging objects and the widget can pause orbit. */}
        <OrbitControls makeDefault />
      </Canvas>
    </SplitLayout>
  )
}
