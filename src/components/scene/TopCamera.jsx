import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import { useModeStore } from '../../store/modeStore'
import { useRoomStore } from '../../store/roomStore'
import { TOP_CAMERA_HEIGHT, TOP_MAX_ZOOM, TOP_MIN_ZOOM, fitTopView } from './planViews'


// Moves the 2D camera and the pan controls to the saved 2D view, or fits the
// whole room when there is none.
function applyTopView(camera, controls, size) {
  const view = useModeStore.getState().topView ?? fitTopView(useRoomStore.getState().room, size.width, size.height)
  const [x, z] = view.center
  camera.position.set(x, TOP_CAMERA_HEIGHT, z)
  camera.zoom = view.zoom
  camera.updateProjectionMatrix()
  controls.target.set(x, 0, z)
  controls.update()
}

// Keeps the 2D view of Plan (J.1) like PlanCamera keeps the 3D one: applies
// the saved view once the controls exist and saves it when the 2D canvas
// closes. Also fits the room again on resetTopView (New, Open) while open.
// Must sit after <MapControls makeDefault> in the Canvas.
export default function TopCamera() {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const get = useThree((state) => state.get)
  const resets = useModeStore((state) => state.topViewResets)
  // Resets already applied: only a new one after opening moves the camera.
  const appliedResets = useRef(resets)

  useLayoutEffect(() => {
    if (!controls) return
    applyTopView(camera, controls, get().size)

    return () => {
      useModeStore.getState().setTopView({
        center: [controls.target.x, controls.target.z],
        zoom: camera.zoom,
      })
    }
  }, [camera, controls, get])

  useLayoutEffect(() => {
    if (!controls || resets === appliedResets.current) return
    appliedResets.current = resets
    applyTopView(camera, controls, get().size)
  }, [resets, camera, controls, get])

  return null
}

// Pan and zoom for a top-down canvas: dragging empty space pans, the wheel
// zooms toward the pointer, no turning. The view is the same in Plan's 2D and
// kept by TopCamera.
export function TopControls() {
  return (
    <>
      <MapControls
        makeDefault
        enableRotate={false}
        screenSpacePanning
        zoomToCursor
        minZoom={TOP_MIN_ZOOM}
        maxZoom={TOP_MAX_ZOOM}
      />
      <TopCamera />
    </>
  )
}
