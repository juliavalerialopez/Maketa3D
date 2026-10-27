import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { Quaternion } from 'three'
import { useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { clampPosition, objectTransform } from '../../store/roomBounds'
import { widgetControls } from './widgetState'

const ROTATION_STEP = Math.PI / 12 // 15°
// The ring sits outside the move arrows (arrows reach ~1.1, ring radius 1 × size).
const RING_SIZE = 1.5
const FULL_TURN = Math.PI * 2

const normalizeAngle = (radians) => ((radians % FULL_TURN) + FULL_TURN) % FULL_TURN
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

    // Arrows win where they overlap the ring: while an arrow is hovered or
    // dragged, the ring is paused (unless it is already being dragged).
    const handleAxisChanged = (event) => {
      if (!rotate.dragging) rotate.enabled = event.value === null
    }
    translate.addEventListener('axis-changed', handleAxisChanged)
    return () => {
      translate.removeEventListener('axis-changed', handleAxisChanged)
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

  function handleRotateStart() {
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
    apply(group, object, { rotation: [x, normalizeAngle(y + angle), z] })
  }

  return (
    <>
      <TransformControls
        ref={translateRef}
        object={target}
        mode="translate"
        showY={false}
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
        onObjectChange={handleRotate}
      />
    </>
  )
}
