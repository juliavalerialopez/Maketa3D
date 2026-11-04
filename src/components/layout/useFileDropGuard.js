import { useEffect } from 'react'

const holdsFile = (event) => event.dataTransfer?.types.includes('Files')

// A file dropped anywhere except a Reference card (which handles its own
// drop, I.10) does nothing. Without this the browser opens the file in the
// tab and the session (layout, photos, versions) is lost. Over the rest of
// the page the cursor shows that a drop is not possible.
export default function useFileDropGuard() {
  useEffect(() => {
    function handleDragOver(event) {
      if (!holdsFile(event) || event.defaultPrevented) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'none'
    }
    function handleDrop(event) {
      if (holdsFile(event)) event.preventDefault()
    }
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])
}
