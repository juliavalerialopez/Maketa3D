import { useEffect } from 'react'
import { useUiStore } from '../../store/uiStore'

// How long a Build message stays, in seconds.
const NOTICE_SECONDS = 5

// Build's short message (J.8) at the bottom of the view, e.g. why a wall
// stopped or a door did not fit. Plain HTML above the canvas; it lets clicks
// through.
export default function BuildNotice() {
  const notice = useUiStore((state) => state.buildNotice)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => useUiStore.getState().setBuildNotice(null), NOTICE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  if (!notice) return null
  return (
    <p className="scene-notice" role="status">
      {notice}
    </p>
  )
}
