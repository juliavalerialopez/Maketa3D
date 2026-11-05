import Button from '../ui/Button'
import { useUiStore } from '../../store/uiStore'

// The outline of the camera preview (drawn by CameraPreview inside
// the canvas, I.14), and the toggle at the top right that shows or hides it.
// Plain HTML above the canvas: it never blocks the scene (pointer-events:
// none) and is never part of a WebGL render. Replaces the frame guide.
export default function PreviewFrame() {
  const previewVisible = useUiStore((state) => state.previewVisible)
  const togglePreview = useUiStore((state) => state.togglePreview)

  return (
    <>
      {previewVisible && (
        <div className="camera-preview" aria-hidden="true" />
      )}
      <div className="preview-toggle">
        <Button pressed={previewVisible} onClick={togglePreview}>
          Preview
        </Button>
      </div>
    </>
  )
}
