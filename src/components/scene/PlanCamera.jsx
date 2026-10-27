import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useModeStore } from '../../store/modeStore'

// Keeps the Plan orbit camera across mode switches: applies the saved view
// once the orbit controls exist, and saves the view when the Canvas unmounts.
// Must sit after <OrbitControls makeDefault> in the Canvas.
export default function PlanCamera() {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)

  useLayoutEffect(() => {
    if (!controls) return
    const { position, target } = useModeStore.getState().planView
    camera.position.set(...position)
    controls.target.set(...target)
    controls.update()

    return () => {
      useModeStore.getState().setPlanView({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      })
    }
  }, [camera, controls])

  return null
}
