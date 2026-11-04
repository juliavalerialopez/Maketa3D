import IconButton from '../ui/IconButton'
import { selectCanRedo, selectCanUndo, useHistoryStore } from '../../store/historyStore'

const UndoIcon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 3.5L2.5 7 6 10.5M3 7h6.5a3.5 3.5 0 0 1 0 7H8" />
  </svg>
)

const RedoIcon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M10 3.5L13.5 7 10 10.5M13 7H6.5a3.5 3.5 0 0 0 0 7H8" />
  </svg>
)

// The shortcut key shown in the tooltips: Cmd on Apple devices, else Ctrl.
const MODIFIER = /Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'

// Undo and Redo over the top left of the 3D scene (I.11), each disabled when
// there is nothing to undo or redo. Plain HTML above the canvas, like the
// frame toggle.
export default function HistoryButtons() {
  const canUndo = useHistoryStore(selectCanUndo)
  const canRedo = useHistoryStore(selectCanRedo)
  const undo = useHistoryStore((state) => state.undo)
  const redo = useHistoryStore((state) => state.redo)

  return (
    <div className="history-buttons">
      <IconButton label={`Undo (${MODIFIER}+Z)`} onClick={undo} disabled={!canUndo}>
        {UndoIcon}
      </IconButton>
      <IconButton label={`Redo (${MODIFIER}+Shift+Z)`} onClick={redo} disabled={!canRedo}>
        {RedoIcon}
      </IconButton>
    </div>
  )
}
