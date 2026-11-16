import { OPENING_TYPES } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import Button from '../ui/Button'
import OpeningList from './OpeningList'
import OpeningDetails from './OpeningDetails'
import { TOOL_NOTICES } from './toolNotices'

const SCISSORS_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M8.1 8.1L20 20M8.1 15.9L20 4" />
  </svg>
)

// Build's Wall tools section (J.8, J.7.1, J.8.1, J.8.2). Cut, Door and
// Window turn a tool on, for any wall: a click splits it in two, places a
// door, or sets where a window starts and then ends. Esc or a second press
// turns it off. The list selects one, whose details follow.
export default function OpeningsSection() {
  const tool = useUiStore((state) => state.tool)
  const selectedId = useUiStore((state) => state.selectedOpening)

  function toggle(name) {
    useUiStore.getState().setBuildNotice(null)
    useUiStore.getState().setTool(tool === name ? null : name)
  }

  return (
    <div className="field-stack">
      <div className="object-details-actions">
        <Button onClick={() => toggle('cut')} pressed={tool === 'cut'}>
          {SCISSORS_ICON}
          Cut
        </Button>
        <Button onClick={() => toggle('door')} pressed={tool === 'door'}>
          {OPENING_TYPES.door.label}
        </Button>
        <Button onClick={() => toggle('window')} pressed={tool === 'window'}>
          {OPENING_TYPES.window.label}
        </Button>
      </div>
      {tool && <p className="panel-notice">{TOOL_NOTICES[tool]}</p>}
      <OpeningList />
      {selectedId && <OpeningDetails key={selectedId} id={selectedId} />}
    </div>
  )
}
