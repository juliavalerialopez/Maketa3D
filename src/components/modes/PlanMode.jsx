import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from '../scene/Scene'
import PlanCamera from '../scene/PlanCamera'
import SnapshotBridge from '../scene/SnapshotBridge'
import CameraPreview from '../scene/CameraPreview'
import PreviewFrame from '../scene/PreviewFrame'
import ContextLossGuard from '../scene/ContextLossGuard'
import HistoryButtons from '../scene/HistoryButtons'
import SplitLayout from '../layout/SplitLayout'
import ErrorBoundary from '../layout/ErrorBoundary'
import ControlPanel from '../panel/ControlPanel'
import { useObjectsStore } from '../../store/objectsStore'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'
import { isWidgetActive } from '../scene/widgetState'

// A click that hits no object (empty floor, walls, outside the room) deselects.
// Fiber only calls this for real clicks, not for orbit drags. Floor and walls
// have no pointer handlers, so they never count as hits. Widget handles aren't
// hits either, so a click on a handle is ignored here.
function handlePointerMissed() {
  if (isWidgetActive()) return
  useObjectsStore.getState().selectObject(null)
}

// Plan mode: control panel on the left, 3D scene on the right.
// Holds no state of its own, so nothing is lost when it unmounts.
export default function PlanMode() {
  const planPercent = useUiStore((state) => state.planPercent)
  const setPlanPercent = useUiStore((state) => state.setPlanPercent)
  // Read once: the Canvas takes its camera settings only when it is created.
  const startPosition = useModeStore.getState().planView.position

  return (
    <SplitLayout
      first={<ControlPanel />}
      percent={planPercent}
      onPercentChange={setPlanPercent}
      min={15}
      max={50}
      second={
        <div className="scene-pane">
          {/* A crash or a lost WebGL context shows the error screen here (I.3). */}
          <ErrorBoundary message="The 3D view stopped working.">
            <Canvas camera={{ position: startPosition, fov: 50 }} shadows onPointerMissed={handlePointerMissed}>
              <Scene />
              {/* Default controls, so dragging objects and the widget can pause orbit. */}
              <OrbitControls makeDefault />
              <PlanCamera />
              <SnapshotBridge />
              <ContextLossGuard />
              <CameraPreview />
            </Canvas>
            <PreviewFrame />
            <HistoryButtons />
          </ErrorBoundary>
        </div>
      }
    />
  )
}
