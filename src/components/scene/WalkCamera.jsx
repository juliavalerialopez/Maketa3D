import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Euler, Vector3 } from 'three'
import { useModeStore } from '../../store/modeStore'
import { useRoomStore } from '../../store/roomStore'
import { focusIsFree } from '../panel/useObjectShortcuts'
import { EYE_HEIGHT, WALK_KEYS, WALK_RUN, WALK_SPEED, lookAfterDrag, walkInput, walkStart, walkStep } from './planViews'

// A frame longer than this (a hidden tab, a slow frame) walks only this far
// in time, so nobody jumps across the room.
const MAX_FRAME_SECONDS = 0.1

const look = new Vector3()
const turn = new Euler(0, 0, 0, 'YXZ')

// Puts the camera at the saved Walk view, or at the 3D camera when there is
// none (moved inside the walls, looking the same way, level).
function applyWalkView(camera) {
  const { walkView, planView } = useModeStore.getState()
  const view = walkView ?? walkStart(useRoomStore.getState().room, planView)
  const [x, z] = view.position
  camera.position.set(x, EYE_HEIGHT, z)
  camera.lookAt(x + view.direction[0], EYE_HEIGHT + view.direction[1], z + view.direction[2])
}

// Plan's Walk view (J.1.2), inside the Walk canvas. Dragging the view turns
// the head (the room follows the pointer); W A S D and the arrow keys
// (Shift: faster) walk, level and relative to where the camera looks, and the
// eyes stay inside the walls. Clicks pick
// nothing here (looking only). The view is saved when Walk closes;
// restartWalk (New, Open) starts it again at the 3D camera.
export default function WalkCamera() {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const setEvents = useThree((state) => state.setEvents)
  const resets = useModeStore((state) => state.walkViewResets)
  const appliedResets = useRef(resets)
  // Held keys, by physical key (event.code).
  const keys = useRef(new Set())

  useLayoutEffect(() => {
    // Looking only: no object can be pressed, hovered or deselected.
    setEvents({ enabled: false })
    applyWalkView(camera)

    return () => {
      camera.getWorldDirection(look)
      useModeStore.getState().setWalkView({
        position: [camera.position.x, camera.position.z],
        direction: look.toArray(),
      })
    }
  }, [camera, setEvents])

  // New Project and Open Project start Walk again at the 3D camera.
  useLayoutEffect(() => {
    if (resets === appliedResets.current) return
    appliedResets.current = resets
    applyWalkView(camera)
  }, [resets, camera])

  // Dragging the view turns the head.
  useEffect(() => {
    let drag = null
    function handlePointerDown(event) {
      if (drag || event.button !== 0) return
      turn.setFromQuaternion(camera.quaternion, 'YXZ')
      drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, start: [turn.y, turn.x] }
      canvas.setPointerCapture(event.pointerId)
    }
    function handlePointerMove(event) {
      if (event.pointerId !== drag?.pointer) return
      const [yaw, pitch] = lookAfterDrag(drag.start, event.clientX - drag.x, event.clientY - drag.y, canvas.clientHeight)
      turn.set(pitch, yaw, 0, 'YXZ')
      camera.quaternion.setFromEuler(turn)
    }
    function handlePointerEnd(event) {
      if (event.pointerId === drag?.pointer) drag = null
    }
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerEnd)
    canvas.addEventListener('pointercancel', handlePointerEnd)
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerEnd)
      canvas.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [camera, canvas])

  useEffect(() => {
    const held = keys.current
    function handleKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.code.startsWith('Shift')) held.add(event.code)
      if (!WALK_KEYS[event.code] || !focusIsFree()) return
      // Arrow keys would otherwise scroll the page.
      event.preventDefault()
      held.add(event.code)
    }
    const handleKeyUp = (event) => held.delete(event.code)
    // Keys let go while the window is in the background never come up.
    const handleBlur = () => held.clear()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      held.clear()
    }
  }, [])

  useFrame((_, delta) => {
    const held = keys.current
    const run = held.has('ShiftLeft') || held.has('ShiftRight')
    const distance = Math.min(delta, MAX_FRAME_SECONDS) * WALK_SPEED * (run ? WALK_RUN : 1)
    camera.getWorldDirection(look)
    // Also keeps the eyes inside when the room gets smaller while walking.
    const room = useRoomStore.getState().room
    const [x, z] = walkStep(room, [camera.position.x, camera.position.z], [look.x, look.z], walkInput(held), distance)
    camera.position.set(x, EYE_HEIGHT, z)
  })

  return null
}
