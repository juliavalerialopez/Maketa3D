import SegmentedSwitch from '../ui/SegmentedSwitch'
import { useModeStore } from '../../store/modeStore'
import { takeSnapshot } from '../scene/snapshot'

const MODES = [
  { value: 'plan', label: 'Plan' },
  { value: 'personalize', label: 'Personalize' },
]

// Switching to Personalize unmounts the Plan canvas, so the Room render is
// taken first, while the canvas is still there. Null if it fails.
function switchMode(next) {
  const { mode, setMode, setSnapshot } = useModeStore.getState()
  if (next === mode) return
  if (next === 'personalize') setSnapshot(takeSnapshot())
  setMode(next)
}

// Slim bar above both modes, with the mode switch centered.
export default function TopBar() {
  const mode = useModeStore((state) => state.mode)

  return (
    <header className="top-bar">
      <SegmentedSwitch options={MODES} value={mode} onChange={switchMode} />
    </header>
  )
}
