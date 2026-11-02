import SegmentedSwitch from '../ui/SegmentedSwitch'
import Toggle from '../ui/Toggle'
import ProjectMenu from './ProjectMenu'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'
import { useRestyleStore } from '../../store/restyleStore'
import { takeSnapshot } from '../scene/snapshot'

const MODES = [
  { value: 'plan', label: 'Plan' },
  { value: 'personalize', label: 'Personalize' },
]

// Switching to Personalize unmounts the Plan canvas, so the Room render is
// taken first, while the canvas is still there. Null if it fails. A new
// render clears the AI image, so the two images always match.
function switchMode(next) {
  const { mode, setMode, setSnapshot } = useModeStore.getState()
  if (next === mode) return
  if (next === 'personalize') {
    setSnapshot(takeSnapshot())
    useRestyleStore.getState().clearResult()
  }
  setMode(next)
}

const SunIcon = (
  <svg className="top-bar-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

const MoonIcon = (
  <svg className="top-bar-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
)

// Slim bar above both modes: the logo (opens the Project menu) on the left,
// the mode switch centered, the theme switch on the right.
export default function TopBar() {
  const mode = useModeStore((state) => state.mode)
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)

  return (
    <header className="top-bar">
      <ProjectMenu />
      <SegmentedSwitch options={MODES} value={mode} onChange={switchMode} />
      <div className="top-bar-end">
        <Toggle
          label="Dark theme"
          checked={theme === 'dark'}
          onChange={(dark) => setTheme(dark ? 'dark' : 'light')}
          before={SunIcon}
          after={MoonIcon}
        />
      </div>
    </header>
  )
}
