import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { clampPosition, objectTransform } from '../../store/roomBounds'
import { OBJECT_TYPES } from '../objects/catalog'

// Pixels a press may move and still count as a click (same as Fiber's own
// limit for onPointerMissed).
const CLICK_TOLERANCE = 2

const UP = new Vector3(0, 1, 0)
const hit = new Vector3()

// One object in the scene. Subscribes to its own entry only, so changing
// one object re-renders that object and not the others.
// Press and drag moves it on the floor; a click selects it.
function SceneObject({ id }) {
  const object = useObjectsStore((state) => state.objects.find((item) => item.id === id))
  const controls = useThree((state) => state.controls)
  // Active drag: { pointerId, plane, offsetX, offsetZ }.
  const dragRef = useRef(null)

  if (!object) return null

  function handlePointerDown(event) {
    if (event.button !== 0) return
    event.stopPropagation()
    useObjectsStore.getState().selectObject(id)

    // Drag on a horizontal plane at the height where the object was grabbed,
    // so the grabbed point stays under the cursor.
    const plane = new Plane(UP, -event.point.y)
    if (!event.ray.intersectPlane(plane, hit)) return
    const [x, , z] = object.position
    dragRef.current = { pointerId: event.pointerId, plane, offsetX: x - hit.x, offsetZ: z - hit.z }
    event.target.setPointerCapture(event.pointerId)
    if (controls) controls.enabled = false
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    if (!event.ray.intersectPlane(drag.plane, hit)) return
    const current = useObjectsStore.getState().objects.find((item) => item.id === id)
    if (!current) return
    const { room } = useRoomStore.getState()
    const position = clampPosition(current, room, hit.x + drag.offsetX, hit.z + drag.offsetZ)
    useObjectsStore.getState().updateObject(id, { position })
  }

  function handlePointerUp(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    event.target.releasePointerCapture(event.pointerId)
    if (controls) controls.enabled = true
  }

  function handleClick(event) {
    event.stopPropagation()
    // A press that moved more than a few pixels was a drag, not a click.
    if (event.delta > CLICK_TOLERANCE) return
    useObjectsStore.getState().selectObject(id)
  }

  const Component = OBJECT_TYPES[object.type].component
  const { position, rotation } = objectTransform(object)
  // The scene owns the transform; models only draw themselves at the origin.
  return (
    <group
      name={id}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Component size={object.size} color={object.color} />
    </group>
  )
}

export default function Objects() {
  // Only the ids: the list re-renders when objects are added or removed.
  const ids = useObjectsStore(useShallow((state) => state.objects.map((object) => object.id)))

  return ids.map((id) => <SceneObject key={id} id={id} />)
}
