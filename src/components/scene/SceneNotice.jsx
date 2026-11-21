import { useEffect } from 'react'
import { useUiStore } from '../../store/uiStore'

// How long a message stays, in seconds.
const NOTICE_SECONDS = 5

// The scene's short message (J.8) at the bottom of the view, e.g. why a wall
// stopped or a door did not fit. Plain HTML above the canvas; it lets clicks
// through.
export default function SceneNotice() {
  const notice = useUiStore((state) => state.sceneNotice)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => useUiStore.getState().setSceneNotice(null), NOTICE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  if (!notice) return null
  return (
    <p className="scene-notice" role="status">
      {notice}
    </p>
  )
}
