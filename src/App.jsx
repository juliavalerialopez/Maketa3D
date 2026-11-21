import TopBar from './components/layout/TopBar'
import PlanMode from './components/modes/PlanMode'
import PersonalizeMode from './components/modes/PersonalizeMode'
import ErrorBoundary from './components/layout/ErrorBoundary'
import useFileDropGuard from './components/layout/useFileDropGuard'
import { useModeStore } from './store/modeStore'

const MODES = { plan: PlanMode, personalize: PersonalizeMode }

// The top bar and exactly one mode below it. A crash in a mode shows the
// error screen there and keeps the top bar (I.3); switching modes starts the
// boundary fresh (keyed by mode).
export default function App() {
  const mode = useModeStore((state) => state.mode)
  const Mode = MODES[mode]
  useFileDropGuard()

  return (
    <div className="app">
      <TopBar />
      <main className="mode-area">
        <ErrorBoundary key={mode}>
          <Mode />
        </ErrorBoundary>
      </main>
    </div>
  )
}
