import { useEffect } from 'react'
import { useObjectsStore } from '../../store/objectsStore'

// True while the user is typing in a text or number field, so keys stay with the field.
function isTyping(element) {
  if (element?.tagName === 'TEXTAREA') return true
  return element?.tagName === 'INPUT' && ['text', 'number'].includes(element.type)
}

// Keyboard shortcuts for the selected object.
export default function useObjectShortcuts() {
  useEffect(() => {
    function handleKeyDown(event) {
      if (isTyping(document.activeElement)) return
      const { selectedId, selectObject } = useObjectsStore.getState()
      if (!selectedId) return

      if (event.key === 'Escape') selectObject(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
