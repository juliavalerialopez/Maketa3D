import { useEffect } from 'react'
import { useObjectsStore } from '../../store/objectsStore'
import { useModeStore } from '../../store/modeStore'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture, useHistoryStore } from '../../store/historyStore'
import { clampPosition, nudgeOffset } from '../../store/roomBounds'
import { roomWalls } from '../../store/roomShape'
import { nudgedOpening, openingNudge } from '../../store/openings'
import { currentView } from '../scene/snapshot'
import { TOP_NUDGE_VIEW } from '../scene/planViews'

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
export function focusIsFree() {
  const element = document.activeElement
  return !element || element === document.body || element.tagName === 'CANVAS'
}

// Undo and redo for the key press, in Plan (J.10), also from a
// field being typed in. Returns true when the key was one of them.
export function runHistoryKey(event) {
  const action = historyAction(event)
  if (!action) return false
  event.preventDefault()
  // In a field, the browser's own text undo would set the room to a
  // half-typed size (J0.5): the field is finished first (limited, like a
  // blur, its change one step), then the app's undo runs.
  if (isTyping(document.activeElement)) document.activeElement.blur()
  // A burst of arrow presses ends first, so it can be undone at once.
  endNudge()
  useHistoryStore.getState()[action]()
  return true
}

// The open arrow-key burst: its undo step is open (I.11) and the moved-distance
// label shows (J0.3.1) until the keys rest for NUDGE_BURST_MS. nudgeId is the
// object it moves, or the door or window (J.9.3, which has no label).
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
  // In 2D, up on screen is always the back of the room (J.1).
  const view = useUiStore.getState().sceneView === '2d' ? TOP_NUDGE_VIEW : currentView()
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

// Moves the selected door or window one 5 cm step for an arrow key (J.9.3),
// following the screen: along its wall, and up and down for a window in 3D.
// A burst of presses is one undo step, like furniture. Returns false for
// other keys.
function nudgeOpening(event, room, opening) {
  const topView = useUiStore.getState().sceneView === '2d'
  const view = topView ? TOP_NUDGE_VIEW : currentView()
  const wall = roomWalls(room.corners)[opening.wallIndex]
  const move = view && wall && openingNudge(view, wall, event.key, !topView && opening.type === 'window')
  if (!move) return false
  if (!move.along && !move.up) return true
  // Another one selected mid-burst starts a burst of its own.
  if (nudgeTimer && nudgeId !== opening.id) endNudge()
  if (!nudgeTimer) {
    beginGesture()
    nudgeId = opening.id
  }
  clearTimeout(nudgeTimer)
  nudgeTimer = setTimeout(endNudge, NUDGE_BURST_MS)
  useRoomStore.getState().updateOpening(opening.id, nudgedOpening(room, opening, move))
  return true
}

// For the selected door or window in Plan (J.9.1): Escape lets it go, Delete
// or Backspace removes it, the arrow keys move it (J.9.3).
function openingKeys(event) {
  const ui = useUiStore.getState()
  const { room, removeOpening } = useRoomStore.getState()
  const opening = room.openings?.find((item) => item.id === ui.selectedOpening)
  if (!opening) {
    // The selected wall (K.1.15) lets go with Escape.
    if (event.key === 'Escape' && ui.selectedWall) ui.selectWall(null)
    return
  }
  if (event.key === 'Escape') ui.selectOpening(null)
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    endNudge()
    removeOpening(opening.id)
    ui.selectOpening(null)
    return
  }
  // Arrow keys would otherwise scroll the page.
  if (nudgeOpening(event, room, opening)) event.preventDefault()
}

// Keyboard shortcuts in Plan: undo and redo (also from a field being typed
// in), for the selected object Delete, Escape, the arrow keys and Ctrl+D, and
// for the selected door or window Delete, Escape and the arrow keys. Plan
// mode only: in Personalize the scene is not visible, so nothing may be
// changed, deleted or deselected there.
// Ctrl+S and Ctrl+O are in ProjectMenu (all modes).
export default function useObjectShortcuts() {
  useEffect(() => {
    function handleKeyDown(event) {
      if (useModeStore.getState().mode !== 'plan') return
      // Keys for an open menu or a modal dialog.
      if (event.defaultPrevented || document.querySelector('dialog[open], [role="menu"]')) return

      if (runHistoryKey(event)) return
      // Other keys stay with a field being typed in.
      if (isTyping(document.activeElement)) return

      // Esc turns a door or window placing tool off (J.9.4), also with the
      // focus on its button.
      const ui = useUiStore.getState()
      if (event.key === 'Escape' && ui.tool) {
        ui.setTool(null)
        return
      }

      // Ctrl+D duplicates (J0.6); the browser's bookmark key is blocked.
      const duplicate = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'd'
      if (duplicate) event.preventDefault()

      if (!focusIsFree() || event.altKey) return
      if ((event.ctrlKey || event.metaKey) && !duplicate) return
      // Walk is for looking only (J.1.2): its keys walk, nothing is changed.
      if (useUiStore.getState().sceneView === 'walk') return
      const { selectedId, selectObject, removeObject, duplicateObject } = useObjectsStore.getState()
      const object = useObjectsStore.getState().objects.find((item) => item.id === selectedId)
      if (!object) {
        if (!duplicate) openingKeys(event)
        return
      }

      if (duplicate) {
        endNudge()
        duplicateObject(selectedId)
        return
      }

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
