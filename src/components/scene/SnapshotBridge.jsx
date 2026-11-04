import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector2, Vector3 } from 'three'
import { canvasToPng, snapshotBridge } from './snapshot'
import { RENDER_HEIGHT, RENDER_WIDTH, cameraView, frameFov, framePosition } from '../../services/frame'
import { widgetControls } from './widgetState'
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

// A copy of the Plan camera that sees exactly what the frame guide shows, at
// 16:9 (I.13): same place and direction, field of view narrowed when the
// canvas is taller than 16:9.
function frameCamera(camera, width, height) {
  const renderCamera = camera.clone()
  renderCamera.aspect = RENDER_WIDTH / RENDER_HEIGHT
  renderCamera.fov = frameFov(camera.fov, width, height)
  renderCamera.updateProjectionMatrix()
  return renderCamera
}

// Hides helpers (objects with userData.helper, and the widget) and hidden
// objects (H.6.2), renders the frame once at the fixed Room render size
// (I.13: the canvas is drawn at 1920 x 1080 for that one render, then set
// back to its own size and drawn again), and shows them again. All in one
// call, so the page never shows the scene without them or at the wrong size.
// Also returns the object positions and the camera that took it.
function captureScene(gl, scene, camera) {
  const canvas = gl.domElement
  if (gl.getContext().isContextLost() || !canvas.width || !canvas.height) return null

  const size = gl.getSize(new Vector2())
  const pixelRatio = gl.getPixelRatio()
  const renderCamera = frameCamera(camera, size.x, size.y)

  const hidden = []
  const hide = (object) => {
    if (!object?.visible) return
    object.visible = false
    hidden.push(object)
  }
  scene.traverse((object) => {
    if (object.userData.helper) hide(object)
  })
  Object.values(widgetControls).forEach(hide)
  useObjectsStore
    .getState()
    .objects.filter((object) => object.hidden)
    .forEach((object) => hide(scene.getObjectByName(object.id)))

  try {
    gl.setPixelRatio(1)
    gl.setSize(RENDER_WIDTH, RENDER_HEIGHT, false)
    gl.render(scene, renderCamera)
    const image = canvasToPng(canvas)
    return {
      image,
      objects: objectPositions(scene, renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
      view: cameraView(renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
    }
  } finally {
    hidden.forEach((object) => (object.visible = true))
    // Size first: setPixelRatio resizes the buffer with the current size.
    gl.setSize(size.x, size.y, false)
    gl.setPixelRatio(pixelRatio)
    gl.render(scene, camera)
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
