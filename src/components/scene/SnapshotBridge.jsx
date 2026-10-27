import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { cropToFrame, snapshotBridge } from './snapshot'
import { widgetControls } from './widgetState'

// Hides helpers (objects with userData.helper, and the widget), renders the
// scene once, crops it to the frame and shows the helpers again. All in one
// call, so the page never shows the scene without its helpers.
function captureScene(gl, scene, camera) {
  const canvas = gl.domElement
  if (gl.getContext().isContextLost() || !canvas.width || !canvas.height) return null

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

  try {
    gl.render(scene, camera)
    return cropToFrame(canvas)
  } finally {
    hidden.forEach((object) => (object.visible = true))
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
