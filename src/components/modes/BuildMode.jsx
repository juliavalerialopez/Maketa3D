import { Canvas } from '@react-three/fiber'
import BuildScene from '../scene/BuildScene'
import ContextLossGuard from '../scene/ContextLossGuard'
import { TopControls } from '../scene/TopCamera'
import { topCameraSettings } from '../scene/planViews'
import { useModeStore } from '../../store/modeStore'
import SplitLayout from '../layout/SplitLayout'
import ErrorBoundary from '../layout/ErrorBoundary'
import Section from '../panel/Section'
import RoomInputs from '../panel/RoomInputs'
import { useUiStore } from '../../store/uiStore'

// Build mode (J.5): Room configuration on the left (shape buttons, Height),
// the room from above on the right, where each wall's length can be typed.
// Pan and zoom like Plan's 2D view, and the same view. Holds no state of its
// own, so nothing is lost when it unmounts. Leaving Build moves pieces
// inside the walls (layout/modeSwitch.js).
export default function BuildMode() {
  const planPercent = useUiStore((state) => state.planPercent)
  const setPlanPercent = useUiStore((state) => state.setPlanPercent)

  return (
    <SplitLayout
      first={
        <div className="control-panel">
          <Section id="room" title="Room configuration">
            <RoomInputs inBuild />
          </Section>
        </div>
      }
      percent={planPercent}
      onPercentChange={setPlanPercent}
      min={15}
      max={50}
      second={
        <div className="scene-pane">
          <ErrorBoundary message="The Build view stopped working.">
            <Canvas orthographic camera={topCameraSettings(useModeStore.getState().topView)}>
              <BuildScene />
              <ContextLossGuard />
              <TopControls />
            </Canvas>
          </ErrorBoundary>
        </div>
      }
    />
  )
}
