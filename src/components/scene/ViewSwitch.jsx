import SegmentedSwitch from '../ui/SegmentedSwitch'
import { useUiStore } from '../../store/uiStore'

// Walk comes in J.1.2.
const VIEWS = [
  { value: '2d', label: '2D' },
  { value: '3d', label: '3D' },
  { value: 'walk', label: 'Walk', disabled: true, title: 'Coming soon' },
]

// The 2D · 3D · Walk switch at the top center of Plan's scene (J.1). Plain
// HTML above the canvas, like the Undo buttons.
export default function ViewSwitch() {
  const sceneView = useUiStore((state) => state.sceneView)
  const setSceneView = useUiStore((state) => state.setSceneView)

  return (
    <div className="view-switch">
      <SegmentedSwitch options={VIEWS} value={sceneView} onChange={setSceneView} label="View" size="small" />
    </div>
  )
}
