import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector2, Vector3 } from 'three'
import { canvasToPng, snapshotBridge } from './snapshot'
import { prepareRoomRender } from './roomRenderView'
import { RENDER_HEIGHT, RENDER_WIDTH, cameraView, framePosition, renderCamera } from '../../services/frame'
import { useObjectsStore } from '../../store/objectsStore'
import { useCameraStore } from '../../store/cameraStore'

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

// Renders the Room render once from the placeable camera (I.14), at the
// fixed size (I.13: the canvas is drawn at 1920 x 1080 for that one render,
// then set back to its own size and drawn again for the Plan view). Helpers,
// the widget and hidden objects are left out (prepareRoomRender). All in one
// call, so the page never shows the scene prepared for the render. Also
// returns the object positions and the camera that took it.
function captureScene(gl, scene, planCamera) {
  const canvas = gl.domElement
  if (gl.getContext().isContextLost() || !canvas.width || !canvas.height) return null

  const size = gl.getSize(new Vector2())
  const pixelRatio = gl.getPixelRatio()
  const camera = renderCamera(useCameraStore.getState().camera)
  const restore = prepareRoomRender(scene, camera, planCamera)

  try {
    gl.setPixelRatio(1)
    gl.setSize(RENDER_WIDTH, RENDER_HEIGHT, false)
    gl.render(scene, camera)
    const image = canvasToPng(canvas)
    return {
      image,
      objects: objectPositions(scene, camera, RENDER_WIDTH, RENDER_HEIGHT),
      view: cameraView(camera, RENDER_WIDTH, RENDER_HEIGHT),
    }
  } finally {
    restore()
    // Size first: setPixelRatio resizes the buffer with the current size.
    gl.setSize(size.x, size.y, false)
    gl.setPixelRatio(pixelRatio)
    gl.render(scene, planCamera)
  }
}

// Inside the Plan Canvas: makes the capture available to the mode switch
// while the Canvas is mounted.
export default function SnapshotBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    snapshotBridge.capture = () => captureScene(gl, scene, camera)
    return () => {
      snapshotBridge.capture = null
    }
  }, [gl, scene, camera])

  return null
}
