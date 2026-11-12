import { Canvas } from '@react-three/fiber'
import { MapControls, OrbitControls } from '@react-three/drei'
import Scene from '../scene/Scene'
import PlanCamera from '../scene/PlanCamera'
import TopCamera from '../scene/TopCamera'
import SnapshotBridge from '../scene/SnapshotBridge'
import FrameGuide from '../scene/FrameGuide'
import ContextLossGuard from '../scene/ContextLossGuard'
import HistoryButtons from '../scene/HistoryButtons'
import CameraSlots from '../scene/CameraSlots'
import ViewSwitch from '../scene/ViewSwitch'
import { PLAN_FOV, TOP_CAMERA_HEIGHT, TOP_MAX_ZOOM, TOP_MIN_ZOOM } from '../scene/planViews'
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

// A press in the 3D view takes the focus off a panel field or button (J0.5),
// so the arrow keys, Delete and Ctrl+Z go to the scene, not to that field.
// A field being typed in is finished like a blur.
function releaseFocus() {
  const active = document.activeElement
  if (active && active !== document.body && active.closest('.control-panel')) active.blur()
}

// What every view's canvas holds besides its camera and controls.
function SceneContent() {
  return (
    <>
      <Scene />
      <SnapshotBridge />
      <ContextLossGuard />
    </>
  )
}

// 3D: the orbit camera, kept across mode and view switches (PlanCamera).
function OrbitCanvas() {
  // Read once: the Canvas takes its camera settings only when it is created.
  const startPosition = useModeStore.getState().planView.position
  return (
    <Canvas camera={{ position: startPosition, fov: PLAN_FOV }} shadows onPointerMissed={handlePointerMissed}>
      <SceneContent />
      {/* Default controls, so dragging objects and the widget can pause orbit. */}
      <OrbitControls makeDefault />
      <PlanCamera />
    </Canvas>
  )
}

// 2D (J.1): straight from above with no perspective, the front wall at the
// bottom (up on screen is -z). Dragging empty space pans, the wheel zooms
// toward the pointer, no turning (TopCamera keeps the view).
function TopCanvas() {
  // Read once, so the first frame already shows the saved view (or a rough
  // fit until TopCamera fits the room to the canvas size).
  const { center, zoom } = useModeStore.getState().topView ?? { center: [0, 0], zoom: 50 }
  return (
    <Canvas
      orthographic
      camera={{
        position: [center[0], TOP_CAMERA_HEIGHT, center[1]],
        zoom,
        up: [0, 0, -1],
        near: 0.1,
        far: TOP_CAMERA_HEIGHT * 4,
      }}
      shadows
      onPointerMissed={handlePointerMissed}
    >
      <SceneContent />
      <MapControls
        makeDefault
        enableRotate={false}
        screenSpacePanning
        zoomToCursor
        minZoom={TOP_MIN_ZOOM}
        maxZoom={TOP_MAX_ZOOM}
      />
      <TopCamera />
    </Canvas>
  )
}

// Plan mode: control panel on the left, 3D scene on the right.
// Holds no state of its own, so nothing is lost when it unmounts.
export default function PlanMode() {
  const planPercent = useUiStore((state) => state.planPercent)
  const setPlanPercent = useUiStore((state) => state.setPlanPercent)
  const sceneView = useUiStore((state) => state.sceneView)
  const is3d = sceneView === '3d'

  return (
    <SplitLayout
      first={<ControlPanel />}
      percent={planPercent}
      onPercentChange={setPlanPercent}
      min={15}
      max={50}
      second={
        <div className="scene-pane" onPointerDownCapture={releaseFocus}>
          {/* A crash or a lost WebGL context shows the error screen here (I.3). */}
          <ErrorBoundary message="The 3D view stopped working.">
            {/* Each view has its own canvas (keys differ), so switching
                closes one camera (it saves its view) and opens the other. */}
            {sceneView === '2d' ? <TopCanvas key="2d" /> : <OrbitCanvas key="3d" />}
            {/* The frame and the camera slots belong to the 3D camera: the
                Room renders always come from it (J.1). */}
            {is3d && <FrameGuide />}
            <HistoryButtons />
            <ViewSwitch />
            {is3d && <CameraSlots />}
          </ErrorBoundary>
        </div>
      }
    />
  )
}
