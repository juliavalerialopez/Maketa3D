import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector2, Vector3 } from 'three'
import { canvasToPng, canvasToThumbnail, snapshotBridge } from './snapshot'
import { prepareRoomRender } from './roomRenderView'
import {
  RENDER_HEIGHT,
  RENDER_WIDTH,
  cameraView,
  framePosition,
  frameView,
  viewCamera,
} from '../../services/frame'
import { useObjectsStore } from '../../store/objectsStore'

const box = new Box3()
const centre = new Vector3()

// Each object's centre (the middle of its 3D bounding box) as a position in
// the Room render, so the AI can tell the grey shapes apart (H.7). The scene
// names each object's group after its id (scene/Objects.jsx).
function objectPositions(scene, camera, width, height) {
  return useObjectsStore.getState().objects.flatMap((object) => {
    const group = scene.getObjectByName(object.id)
    if (!group) return []
    box.setFromObject(group).getCenter(centre)
    return [{ id: object.id, ...framePosition(centre, camera, width, height) }]
  })
}

// Renders `view` once at the fixed Room render size (I.13: the canvas is
// drawn at 1920 x 1080 for that one render, then set back to its own size
// and drawn again for the Plan view), and hands the canvas to `read` before
// anything is shown. Helpers, the widget and hidden objects are left out
// (prepareRoomRender). All in one call, so the page never shows the scene
// prepared for the render.
function renderView(gl, scene, planCamera, view, read) {
  const canvas = gl.domElement
  if (gl.getContext().isContextLost() || !canvas.width || !canvas.height) return null

  const size = gl.getSize(new Vector2())
  const pixelRatio = gl.getPixelRatio()
  const camera = viewCamera(view)
  const restore = prepareRoomRender(scene, camera, planCamera)

  try {
    gl.setPixelRatio(1)
    gl.setSize(RENDER_WIDTH, RENDER_HEIGHT, false)
    gl.render(scene, camera)
    return read(canvas, camera)
  } finally {
    restore()
    // Size first: setPixelRatio resizes the buffer with the current size.
    gl.setSize(size.x, size.y, false)
    gl.setPixelRatio(pixelRatio)
    gl.render(scene, planCamera)
  }
}

// Inside the Plan Canvas: makes the captures available to the mode switch and
// the camera slots while the Canvas is mounted (see snapshot.js).
export default function SnapshotBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)

  useEffect(() => {
    // The frame guide's view now: the Plan camera and the point it orbits
    // (or, before the orbit controls exist, a point straight ahead of it).
    const currentView = () => {
      const size = gl.getSize(new Vector2())
      const target = controls?.target ?? camera.getWorldDirection(new Vector3()).add(camera.position)
      return frameView(camera, target, size.x, size.y)
    }
    snapshotBridge.currentView = currentView
    snapshotBridge.capture = () =>
      renderView(gl, scene, camera, currentView(), (canvas, renderCamera) => ({
        image: canvasToPng(canvas),
        objects: objectPositions(scene, renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
        view: cameraView(renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
      }))
    snapshotBridge.thumbnail = (view) => renderView(gl, scene, camera, view, canvasToThumbnail)
    return () => {
      snapshotBridge.capture = null
      snapshotBridge.thumbnail = null
      snapshotBridge.currentView = null
    }
  }, [gl, scene, camera, controls])

  return null
}
