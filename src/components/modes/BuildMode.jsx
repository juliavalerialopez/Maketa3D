import { Canvas } from '@react-three/fiber'
import BuildScene from '../scene/BuildScene'
import ContextLossGuard from '../scene/ContextLossGuard'
import BuildNotice from '../scene/BuildNotice'
import MeterScale from '../scene/MeterScale'
import ScaleLegend from '../scene/ScaleLegend'
import { TopControls } from '../scene/TopCamera'
import { topCameraSettings } from '../scene/planViews'
import SplitLayout from '../layout/SplitLayout'
import ErrorBoundary from '../layout/ErrorBoundary'
import BuildPanel from '../panel/BuildPanel'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'

// A click on the floor or outside the room deselects the wall (J.7) or the
// door or window (J.8).
function deselectWall() {
  const ui = useUiStore.getState()
  ui.selectWall(null)
  ui.selectOpening(null)
}

// Build mode (J.5): the panel on the left (Room configuration, the selected
// wall), the room from above on the right, where walls are typed, dragged and
// cut. Pan and zoom like Plan's 2D view, and the same view. Holds no state of
// its own, so nothing is lost when it unmounts. Leaving Build moves pieces
// inside the walls (layout/modeSwitch.js).
export default function BuildMode() {
  const planPercent = useUiStore((state) => state.planPercent)
  const setPlanPercent = useUiStore((state) => state.setPlanPercent)

  return (
    <SplitLayout
      first={<BuildPanel />}
      percent={planPercent}
      onPercentChange={setPlanPercent}
      min={15}
      max={50}
      second={
        <div className="scene-pane">
          <ErrorBoundary message="The Build view stopped working.">
            <Canvas
              orthographic
              camera={topCameraSettings(useModeStore.getState().topView)}
              onPointerMissed={deselectWall}
            >
              <BuildScene />
              <ContextLossGuard />
              <TopControls />
              <MeterScale />
            </Canvas>
            <ScaleLegend />
            <BuildNotice />
          </ErrorBoundary>
        </div>
      }
    />
  )
}
