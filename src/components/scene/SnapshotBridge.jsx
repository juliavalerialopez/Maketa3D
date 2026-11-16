import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector2, Vector3 } from 'three'
import { canvasToPng, canvasToThumbnail, planCanvasReady, snapshotBridge } from './snapshot'
import { prepareRoomRender } from './roomRenderView'
import {
  RENDER_HEIGHT,
  RENDER_WIDTH,
  cameraView,
  facingOf,
  framePosition,
  frameView,
  openingFrame,
  viewCamera,
} from '../../services/frame'
import { useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { openingLabel, openingsOf } from '../../store/openings'
import { useCameraSlotsStore } from '../../store/cameraSlotsStore'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'
import { PLAN_FOV } from './planViews'

const box = new Box3()
const centre = new Vector3()

// Each object's centre (the middle of its 3D bounding box) as a position in
// the Room render, so the AI can tell the grey shapes apart (H.7), and which
// way its front faces there (I.19; null for a type without a front). The
// scene names each object's group after its id (scene/Objects.jsx).
function objectPositions(scene, camera, width, height) {
  return useObjectsStore.getState().objects.flatMap((object) => {
    const group = scene.getObjectByName(object.id)
    if (!group) return []
    box.setFromObject(group).getCenter(centre)
    const facing = facingOf(object, camera)
    return [{ id: object.id, ...framePosition(centre, camera, width, height), facing }]
  })
}

// The doors and windows that show in the Room render, each with its list name
// and the rectangle it covers there (J.11.1), so the AI keeps their place and
// size: [{ type, name, left, right, top, bottom }].
function openingFrames(camera, width, height) {
  const { room } = useRoomStore.getState()
  const walls = roomWalls(room.corners)
  return openingsOf(room).flatMap((opening) => {
    const wall = walls[opening.wallIndex]
    const frame = wall && openingFrame(wall, opening, camera, width, height)
    return frame ? [{ type: opening.type, name: openingLabel(room, opening), ...frame }] : []
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
// the camera slots while the Canvas is mounted (see snapshot.js), and draws
// the thumbnails of camera slots that have none (after Open Project, I.14.3).
export default function SnapshotBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const slots = useCameraSlotsStore((state) => state.slots)

  // Runs after the scene has the opened room and objects: Open changes them
  // and the slots in one step, so this commit of the Canvas has them all. A
  // thumbnail that fails (e.g. context lost) stays empty.
  useEffect(() => {
    slots.forEach((slot, index) => {
      if (!slot || slot.thumbnail) return
      try {
        const thumbnail = renderView(gl, scene, camera, slot.view, canvasToThumbnail)
        if (thumbnail) useCameraSlotsStore.getState().setThumbnail(index, thumbnail)
      } catch {
        // Left empty, like a failed capture (snapshot.js).
      }
    })
  }, [slots, gl, scene, camera])

  useEffect(() => {
    // The frame guide's view now: the Plan camera and the point it orbits
    // (or, before the orbit controls exist, the stored 3D target, which the
    // camera was just set to look at).
    // In 2D and Walk it is the 3D camera kept in the store, so the Room
    // renders always come from the 3D camera (J.1).
    const currentView = () => {
      const size = gl.getSize(new Vector2())
      if (useUiStore.getState().sceneView !== '3d') {
        const { position, target } = useModeStore.getState().planView
        return frameView({ position: new Vector3(...position), fov: PLAN_FOV }, new Vector3(...target), size.x, size.y)
      }
      const target = controls?.target ?? new Vector3(...useModeStore.getState().planView.target)
      return frameView(camera, target, size.x, size.y)
    }
    snapshotBridge.currentView = currentView
    snapshotBridge.capture = (view) =>
      renderView(gl, scene, camera, view, (canvas, renderCamera) => ({
        image: canvasToPng(canvas),
        objects: objectPositions(scene, renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
        openings: openingFrames(renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
        view: cameraView(renderCamera, RENDER_WIDTH, RENDER_HEIGHT),
      }))
    snapshotBridge.thumbnail = (view) => renderView(gl, scene, camera, view, canvasToThumbnail)
    // A switch waiting for the Plan canvas (Build -> Personalize, J.5) goes
    // on after the next frame, once the scene and its camera are drawn.
    const frame = requestAnimationFrame(planCanvasReady)
    return () => {
      cancelAnimationFrame(frame)
      snapshotBridge.capture = null
      snapshotBridge.thumbnail = null
      snapshotBridge.currentView = null
    }
  }, [gl, scene, camera, controls])

  return null
}
