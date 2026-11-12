import { useState } from 'react'
import SegmentedSwitch from '../ui/SegmentedSwitch'
import Toggle from '../ui/Toggle'
import Dialog from '../ui/Dialog'
import ProjectMenu from './ProjectMenu'
import GenerateButton from './GenerateButton'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'
import { useRestyleStore } from '../../store/restyleStore'
import { switchMode } from './modeSwitch'

// Build is the room's shape from above (J.5); Plan stays the starting mode.
const MODES = [
  { value: 'build', label: 'Build' },
  { value: 'plan', label: 'Plan' },
  { value: 'personalize', label: 'Personalize' },
]

// Leaving Personalize clears the versions, so it asks first when there is
// something to lose: a version, or a request still running.
function hasWorkToLose() {
  const { versions, status } = useRestyleStore.getState()
  return versions.length > 0 || status === 'loading'
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
// the mode switch centered, Generate (Personalize only) and the theme switch
// on the right.
export default function TopBar() {
  const mode = useModeStore((state) => state.mode)
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  // The mode to go to once "Leave Personalize?" is confirmed, or null.
  const [confirmingLeave, setConfirmingLeave] = useState(null)

  function handleModeChange(next) {
    if (mode === 'personalize' && next !== mode && hasWorkToLose()) {
      setConfirmingLeave(next)
      return
    }
    switchMode(next)
  }

  function leavePersonalize() {
    const next = confirmingLeave
    setConfirmingLeave(null)
    useRestyleStore.getState().clearVersions()
    switchMode(next)
  }

  const nextLabel = MODES.find((option) => option.value === confirmingLeave)?.label

  return (
    <header className="top-bar">
      <ProjectMenu />
      <SegmentedSwitch options={MODES} value={mode} onChange={handleModeChange} />
      {confirmingLeave && (
        <Dialog
          title={`Go back to ${nextLabel}?`}
          message="Your AI versions will be cleared."
          confirmLabel={`Go to ${nextLabel}`}
          onConfirm={leavePersonalize}
          onCancel={() => setConfirmingLeave(null)}
        />
      )}
      <div className="top-bar-end">
        {mode === 'personalize' && <GenerateButton />}
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
