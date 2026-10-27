import SegmentedSwitch from '../ui/SegmentedSwitch'
import { useModeStore } from '../../store/modeStore'

const MODES = [
  { value: 'plan', label: 'Plan' },
  { value: 'personalize', label: 'Personalize' },
]

// Slim bar above both modes, with the mode switch centered.
export default function TopBar() {
  const mode = useModeStore((state) => state.mode)
  const setMode = useModeStore((state) => state.setMode)

  return (
    <header className="top-bar">
      <SegmentedSwitch options={MODES} value={mode} onChange={setMode} />
    </header>
  )
}
