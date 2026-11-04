import { useEffect } from 'react'
import { useObjectsStore } from '../../store/objectsStore'
import { useModeStore } from '../../store/modeStore'
import { useHistoryStore } from '../../store/historyStore'

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

// Keyboard shortcuts: undo and redo, and Delete and Escape for the selected
// object. Plan mode only: in Personalize the scene is not visible, so nothing
// may be changed, deleted or deselected there.
export default function useObjectShortcuts() {
  useEffect(() => {
    function handleKeyDown(event) {
      if (useModeStore.getState().mode !== 'plan') return
      if (isTyping(document.activeElement)) return
      // Keys for an open menu or a modal dialog.
      if (event.defaultPrevented || document.querySelector('dialog[open], [role="menu"]')) return

      const action = historyAction(event)
      if (action) {
        event.preventDefault()
        useHistoryStore.getState()[action]()
        return
      }

      const { selectedId, selectObject, removeObject } = useObjectsStore.getState()
      if (!selectedId) return

      if (event.key === 'Escape') selectObject(null)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeObject(selectedId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
