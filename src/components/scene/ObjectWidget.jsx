import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { Quaternion } from 'three'
import { useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import { clampPosition, normalizeRadians, objectTransform } from '../../store/roomBounds'
import { updateRing, widgetControls } from './widgetState'

const ROTATION_STEP = Math.PI / 12 // 15°
// The ring sits outside the move arrows (arrows reach ~1.1, ring radius 1 × size).
const RING_SIZE = 1.5

const delta = new Quaternion()

function getObject(id) {
  return useObjectsStore.getState().objects.find((item) => item.id === id)
}

// Writes the clamped values to the store and to the 3D group right away:
// when the clamped position equals the stored one (pushing into a wall),
// React has nothing to update, so the group would stay where the widget put it.
function apply(group, object, partial) {
  const next = { ...object, ...partial }
  const { room } = useRoomStore.getState()
  next.position = clampPosition(next, room, next.position[0], next.position[2])
  useObjectsStore.getState().updateObject(object.id, { position: next.position, rotation: next.rotation })
  const { position, rotation } = objectTransform(next)
  group.position.set(...position)
  group.rotation.set(...rotation)
}

// Move arrows (X, Z) and a rotate ring (vertical axis), shown together on the
// selected object. Two TransformControls, since one can show only one mode.
export default function ObjectWidget() {
  const selectedId = useObjectsStore((state) => state.selectedId)
  const scene = useThree((state) => state.scene)
  const translateRef = useRef(null)
  const rotateRef = useRef(null)
  // Rotation drag start: the group's quaternion and the stored rotation.
  const rotateStartRef = useRef(null)
  // A widget drag is in progress (its undo step is open, I.11).
  const draggingRef = useRef(false)

  function startDrag() {
    draggingRef.current = true
    beginGesture()
  }

  function endDrag() {
    if (!draggingRef.current) return
    draggingRef.current = false
    endGesture()
  }

  // The move arrows show the moved-distance label while dragging (J0.3.1).
  function handleMoveStart() {
    startDrag()
    const object = getObject(selectedId)
    if (object) useUiStore.getState().setMoving({ id: selectedId, start: [object.position[0], object.position[2]] })
  }

  function handleMoveEnd() {
    endDrag()
    useUiStore.getState().setMoving(null)
  }

  // The selected object's group, looked up when read, not during render: on a
  // fresh Plan mount the group joins the scene only at commit. TransformControls
  // reads object.current in a layout effect (after commit), and the handlers
  // read it when they run.
  const target = useMemo(
    () => ({
      get current() {
        return selectedId ? scene.getObjectByName(selectedId) : undefined
      },
    }),
    [scene, selectedId],
  )

  useEffect(() => {
    const translate = translateRef.current
    const rotate = rotateRef.current
    if (!translate || !rotate) return
    widgetControls.translate = translate
    widgetControls.rotate = rotate

    // Arrows win where they overlap the ring, and an object's body wins over
    // the ring (J0.2): updateRing pauses the ring in both cases.
    const handleAxisChanged = () => updateRing()
    translate.addEventListener('axis-changed', handleAxisChanged)
    updateRing()

    // A drag cut short never sends mouseUp: a cancelled touch, or the widget
    // going away mid-drag (Escape or Delete). Its undo step ends here.
    const cancelDrag = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      endGesture()
      useUiStore.getState().setMoving(null)
    }
    window.addEventListener('pointercancel', cancelDrag)
    return () => {
      translate.removeEventListener('axis-changed', handleAxisChanged)
      window.removeEventListener('pointercancel', cancelDrag)
      cancelDrag()
      widgetControls.translate = null
      widgetControls.rotate = null
    }
  }, [selectedId])

  if (!selectedId) return null

  function handleMove() {
    const group = target.current
    const object = getObject(selectedId)
    if (!group || !object) return
    apply(group, object, { position: [group.position.x, 0, group.position.z] })
  }

  // A ring drag can end over an object: pause the ring again now (J0.2).
  function handleRotateEnd() {
    endDrag()
    updateRing()
  }

  function handleRotateStart() {
    startDrag()
    const group = target.current
    const object = getObject(selectedId)
    if (!group || !object) return
    rotateStartRef.current = { quaternion: group.quaternion.clone(), rotation: object.rotation }
  }

  // The ring turns the group around the world's vertical axis:
  // new = turn × start, so turn = new × start⁻¹, a pure Y rotation.
  // Only Y changes; the stored tilt (X, Z) is kept as it was.
  function handleRotate() {
    const start = rotateStartRef.current
    const group = target.current
    const object = getObject(selectedId)
    if (!start || !group || !object) return
    delta.copy(group.quaternion).multiply(start.quaternion.clone().invert())
    const angle = 2 * Math.atan2(delta.y, delta.w)
    const [x, y, z] = start.rotation
    apply(group, object, { rotation: [x, normalizeRadians(y + angle), z] })
  }

  return (
    <>
      <TransformControls
        ref={translateRef}
        object={target}
        mode="translate"
        showY={false}
        onMouseDown={handleMoveStart}
        onMouseUp={handleMoveEnd}
        onObjectChange={handleMove}
      />
      <TransformControls
        ref={rotateRef}
        object={target}
        mode="rotate"
        showX={false}
        showZ={false}
        rotationSnap={ROTATION_STEP}
        size={RING_SIZE}
        onMouseDown={handleRotateStart}
        onMouseUp={handleRotateEnd}
        onObjectChange={handleRotate}
      />
    </>
  )
}
