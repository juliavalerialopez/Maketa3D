import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector3 } from 'three'
import { cropToFrame, framePosition, snapshotBridge } from './snapshot'
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
    const image = cropToFrame(canvas)
    return { image, objects: objectPositions(scene, camera, canvas.width, canvas.height) }
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
