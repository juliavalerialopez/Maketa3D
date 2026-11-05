import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, PerspectiveCamera } from 'three'
import { renderCamera } from '../../services/frame'
import { useCameraStore } from '../../store/cameraStore'
import { useUiStore } from '../../store/uiStore'
import { prepareRoomRender } from './roomRenderView'
import { SCENE_BACKGROUND } from './snapshot'

// The preview's size and place, shared with .camera-preview in index.css:
// this share of the scene's width, but at most this share of its height
// (so it stays clear of the top buttons in a short pane), 16:9, this many
// pixels from the right and bottom edges.
export const PREVIEW_SHARE = 0.3
export const PREVIEW_MAX_HEIGHT_SHARE = 0.4
export const PREVIEW_MARGIN = 12

const clearColor = new Color()

// Inside the Plan Canvas: draws the Plan view, then a small live preview of
// what the placeable camera sees (I.14) in the bottom right corner, the same
// way the Room render is drawn (prepareRoomRender), on white. Running at
// priority 1 means this draws every frame instead of the Canvas.
export default function CameraPreview() {
  const previewCamera = useMemo(() => new PerspectiveCamera(), [])

  useFrame(({ gl, scene, camera, size }) => {
    gl.render(scene, camera)
    if (!useUiStore.getState().previewVisible) return

    const width = Math.round(
      Math.min(size.width * PREVIEW_SHARE, (size.height * PREVIEW_MAX_HEIGHT_SHARE * 16) / 9),
    )
    const height = Math.round((width * 9) / 16)
    const x = size.width - width - PREVIEW_MARGIN
    const y = PREVIEW_MARGIN // from the bottom
    renderCamera(useCameraStore.getState().camera, previewCamera)
    const restore = prepareRoomRender(scene, previewCamera, camera)
    gl.getClearColor(clearColor)
    const clearAlpha = gl.getClearAlpha()
    try {
      gl.setScissorTest(true)
      gl.setScissor(x, y, width, height)
      gl.setViewport(x, y, width, height)
      gl.setClearColor(SCENE_BACKGROUND, 1)
      gl.render(scene, previewCamera)
    } finally {
      gl.setScissorTest(false)
      gl.setViewport(0, 0, size.width, size.height)
      gl.setClearColor(clearColor, clearAlpha)
      restore()
    }
  }, 1)

  return null
}
