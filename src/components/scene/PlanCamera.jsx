import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useModeStore } from '../../store/modeStore'

// Moves the camera and orbit target to the saved Plan view.
function applyPlanView(camera, controls) {
  const { position, target } = useModeStore.getState().planView
  camera.position.set(...position)
  controls.target.set(...target)
  controls.update()
}

// Keeps the Plan orbit camera across mode switches: applies the saved view
// once the orbit controls exist, and saves the view when the Canvas unmounts.
// Also applies a reset (resetPlanView, e.g. New Project) while mounted.
// Must sit after <OrbitControls makeDefault> in the Canvas.
export default function PlanCamera() {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const resets = useModeStore((state) => state.planViewResets)
  // Resets already applied: only a new one after mounting moves the camera.
  const appliedResets = useRef(resets)

  useLayoutEffect(() => {
    if (!controls) return
    applyPlanView(camera, controls)

    return () => {
      useModeStore.getState().setPlanView({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      })
    }
  }, [camera, controls])

  useLayoutEffect(() => {
    if (!controls || resets === appliedResets.current) return
    appliedResets.current = resets
    applyPlanView(camera, controls)
  }, [resets, camera, controls])

  return null
}
