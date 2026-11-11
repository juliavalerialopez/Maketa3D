import { useEffect } from 'react'
import { useObjectsStore } from '../../store/objectsStore'
import { useModeStore } from '../../store/modeStore'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture, useHistoryStore } from '../../store/historyStore'
import { clampPosition, nudgeOffset } from '../../store/roomBounds'
import { currentView } from '../scene/snapshot'

// Arrow keys move the selected object this far (meters); with Shift, the
// small step (J0.5).
const NUDGE_STEP = 0.1
const NUDGE_STEP_SMALL = 0.01
// Arrow presses closer together than this are one burst: one undo step.
const NUDGE_BURST_MS = 600

// Ctrl+Z undoes; Ctrl+Shift+Z and Ctrl+Y redo (Cmd on Mac). I.11.
function historyAction(event) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null
  const key = event.key.toLowerCase()
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (key === 'y' && !event.shiftKey) return 'redo'
  return null
}

// True while the user is typing in a text or number field, so keys stay with the field.
function isTyping(element) {
  if (element?.tagName === 'TEXTAREA') return true
  return element?.tagName === 'INPUT' && ['text', 'number'].includes(element.type)
}

// True when the focus is on the page or the 3D view, not on a field or a
// button (J0.5): only then do the object keys act, so Backspace on the color
// field or a button never deletes the object.
function focusIsFree() {
  const element = document.activeElement
  return !element || element === document.body || element.tagName === 'CANVAS'
}

// The open arrow-key burst: its undo step is open (I.11) and the moved-distance
// label shows (J0.3.1) until the keys rest for NUDGE_BURST_MS. nudgeId is the
// object it moves.
let nudgeTimer = null
let nudgeId = null

// Ends the burst now, if one is open. Undo and redo call it first (Ctrl+Z and
// the Undo button), since they wait while an undo step is open.
export function endNudge() {
  if (!nudgeTimer) return
  clearTimeout(nudgeTimer)
  nudgeTimer = null
  endGesture()
  // Only its own label: a drag may have started since.
  if (useUiStore.getState().moving?.id === nudgeId) useUiStore.getState().setMoving(null)
  nudgeId = null
}

// Moves the selected object one step for an arrow key, relative to the
// screen, clamped inside the walls. Returns false for other keys.
function nudge(event, object) {
  const view = currentView()
  const offset = view && nudgeOffset(view, event.key, event.shiftKey ? NUDGE_STEP_SMALL : NUDGE_STEP)
  if (!offset) return false
  // Another object selected mid-burst starts a burst of its own.
  if (nudgeTimer && nudgeId !== object.id) endNudge()
  if (!nudgeTimer) {
    beginGesture()
    nudgeId = object.id
    useUiStore.getState().setMoving({ id: object.id, start: [object.position[0], object.position[2]] })
  }
  clearTimeout(nudgeTimer)
  nudgeTimer = setTimeout(endNudge, NUDGE_BURST_MS)
  const [x, , z] = object.position
  const position = clampPosition(object, useRoomStore.getState().room, x + offset[0], z + offset[1])
  useObjectsStore.getState().updateObject(object.id, { position })
  return true
}

// Keyboard shortcuts in Plan: undo and redo (also from a field being typed
// in), and for the selected object Delete, Escape and the arrow keys. Plan mode only: in Personalize the scene
// is not visible, so nothing may be changed, deleted or deselected there.
// Ctrl+S and Ctrl+O are in ProjectMenu (all modes).
export default function useObjectShortcuts() {
  useEffect(() => {
    function handleKeyDown(event) {
      if (useModeStore.getState().mode !== 'plan') return
      // Keys for an open menu or a modal dialog.
      if (event.defaultPrevented || document.querySelector('dialog[open], [role="menu"]')) return

      const action = historyAction(event)
      // Other keys stay with a field being typed in.
      if (!action && isTyping(document.activeElement)) return
      if (action) {
        event.preventDefault()
        // In a field, the browser's own text undo would set the room to a
        // half-typed size (J0.5): the field is finished first (limited, like
        // a blur, its change one step), then the app's undo runs.
        if (isTyping(document.activeElement)) document.activeElement.blur()
        // A burst of arrow presses ends first, so it can be undone at once.
        endNudge()
        useHistoryStore.getState()[action]()
        return
      }

      if (!focusIsFree() || event.ctrlKey || event.metaKey || event.altKey) return
      const { selectedId, selectObject, removeObject } = useObjectsStore.getState()
      const object = useObjectsStore.getState().objects.find((item) => item.id === selectedId)
      if (!object) return

      if (event.key === 'Escape') selectObject(null)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        endNudge()
        removeObject(selectedId)
      }
      // Arrow keys would otherwise scroll the page.
      if (nudge(event, object)) event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      // Leaving Plan mid-burst closes its undo step.
      endNudge()
    }
  }, [])
}
