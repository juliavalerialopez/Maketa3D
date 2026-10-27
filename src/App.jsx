import TopBar from './components/layout/TopBar'
import PlanMode from './components/modes/PlanMode'
import PersonalizeMode from './components/modes/PersonalizeMode'
import { useModeStore } from './store/modeStore'

// The top bar and exactly one mode below it.
export default function App() {
  const mode = useModeStore((state) => state.mode)

  return (
    <div className="app">
      <TopBar />
      <main className="mode-area">{mode === 'plan' ? <PlanMode /> : <PersonalizeMode />}</main>
    </div>
  )
}
