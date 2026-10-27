import Button from '../ui/Button'
import { useUiStore } from '../../store/uiStore'

// 16:9 frame over the 3D scene, centered, with the outside dimmed. It fits the
// height, or the width when the scene is narrower than 16:9 (CSS container
// units, see .frame-guide-box). Plain HTML above the canvas: it never blocks
// the scene (pointer-events: none) and is never part of a WebGL render.
// The toggle at the top right shows or hides it.
export default function FrameGuide() {
  const frameVisible = useUiStore((state) => state.frameVisible)
  const toggleFrame = useUiStore((state) => state.toggleFrame)

  return (
    <>
      {frameVisible && (
        <div className="frame-guide" aria-hidden="true">
          <div className="frame-guide-box" />
        </div>
      )}
      <div className="frame-toggle">
        <Button pressed={frameVisible} onClick={toggleFrame}>
          Frame
        </Button>
      </div>
    </>
  )
}
