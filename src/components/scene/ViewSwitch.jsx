import SegmentedSwitch from '../ui/SegmentedSwitch'
import { useUiStore } from '../../store/uiStore'
import { useModeStore } from '../../store/modeStore'

const VIEWS = [
  { value: '2d', label: '2D' },
  { value: '3d', label: '3D' },
  { value: 'walk', label: 'Walk' },
]

// Choosing Walk starts it where the 3D camera is (J.1.2); a mode switch
// keeps the Walk camera instead.
function chooseView(view) {
  const { sceneView, setSceneView } = useUiStore.getState()
  if (view === sceneView) return
  if (view === 'walk') useModeStore.getState().restartWalk()
  setSceneView(view)
}

// The 2D · 3D · Walk switch at the top center of Plan's scene (J.1). Plain
// HTML above the canvas, like the Undo buttons.
export default function ViewSwitch() {
  const sceneView = useUiStore((state) => state.sceneView)

  return (
    <div className="view-switch">
      <SegmentedSwitch options={VIEWS} value={sceneView} onChange={chooseView} label="View" size="small" />
    </div>
  )
}
