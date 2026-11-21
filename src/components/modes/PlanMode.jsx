import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from '../scene/Scene'
import PlanCamera from '../scene/PlanCamera'
import { TopControls } from '../scene/TopCamera'
import SnapshotBridge from '../scene/SnapshotBridge'
import FrameGuide from '../scene/FrameGuide'
import ContextLossGuard from '../scene/ContextLossGuard'
import HistoryButtons from '../scene/HistoryButtons'
import CameraSlots from '../scene/CameraSlots'
import ViewSwitch from '../scene/ViewSwitch'
import MeterScale from '../scene/MeterScale'
import ScaleLegend from '../scene/ScaleLegend'
import SceneNotice from '../scene/SceneNotice'
import WalkCamera from '../scene/WalkCamera'
import { PLAN_FOV, WALK_FOV, topCameraSettings } from '../scene/planViews'
import SplitLayout from '../layout/SplitLayout'
import ErrorBoundary from '../layout/ErrorBoundary'
import ControlPanel from '../panel/ControlPanel'
import { useObjectsStore } from '../../store/objectsStore'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'
import { isWidgetActive } from '../scene/widgetState'

// A click that hits no object (empty floor, walls, outside the room) deselects
// the furniture or the door or window (J.9.1). Fiber only calls this for real
// clicks, not for orbit drags. Floor and walls have no pointer handlers, so
// they never count as hits; a door or window hidden with its wall is not hit
// either (Openings.jsx). Widget handles aren't hits, so a click on a handle
// is ignored here.
function handlePointerMissed() {
  // A door or window placing tool (J.9.4) stays on until it places or Esc.
  if (isWidgetActive() || useUiStore.getState().tool) return
  useObjectsStore.getState().selectObject(null)
  useUiStore.getState().selectOpening(null)
  useUiStore.getState().selectWall(null)
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
// toward the pointer, no turning (TopCamera keeps the view). Flat,
// with no shading or shadows (J.1.3, Scene.jsx); `shadows` stays on for the
// Room renders taken from here.
function TopCanvas() {
  return (
    <Canvas
      orthographic
      camera={topCameraSettings(useModeStore.getState().topView)}
      shadows
      onPointerMissed={handlePointerMissed}
    >
      <SceneContent />
      <TopControls />
      <MeterScale />
    </Canvas>
  )
}

// Walk (J.1.2): inside the room at eye height. Dragging the view turns the
// head, W A S D walk (WalkCamera).
function WalkCanvas() {
  return (
    <Canvas className="walk-canvas" camera={{ fov: WALK_FOV, near: 0.05 }} shadows>
      <SceneContent />
      <WalkCamera />
    </Canvas>
  )
}

// A line on how to look and walk. Plain HTML that lets clicks through to the
// canvas.
function WalkHint() {
  return <p className="walk-hint">Drag to look around. W A S D or the arrow keys walk, Shift goes faster.</p>
}

// One canvas per view (J.1).
const CANVASES = { '2d': TopCanvas, '3d': OrbitCanvas, walk: WalkCanvas }

// Plan mode: control panel on the left, 3D scene on the right.
// Holds no state of its own, so nothing is lost when it unmounts.
export default function PlanMode() {
  const planPercent = useUiStore((state) => state.planPercent)
  const setPlanPercent = useUiStore((state) => state.setPlanPercent)
  const sceneView = useUiStore((state) => state.sceneView)
  const is3d = sceneView === '3d'
  const ViewCanvas = CANVASES[sceneView]

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
            <ViewCanvas key={sceneView} />
            {sceneView === 'walk' && <WalkHint />}
            {sceneView === '2d' && <ScaleLegend />}
            {sceneView !== 'walk' && <SceneNotice />}
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
