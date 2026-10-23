import { useShallow } from 'zustand/react/shallow'
import { useObjectsStore } from '../../store/objectsStore'
import { objectTransform } from '../../store/roomBounds'
import { OBJECT_TYPES } from '../objects/catalog'

// One object in the scene. Subscribes to its own entry only, so changing
// one object re-renders that object and not the others.
function SceneObject({ id }) {
  const object = useObjectsStore((state) => state.objects.find((item) => item.id === id))
  if (!object) return null

  const Component = OBJECT_TYPES[object.type].component
  const { position, rotation } = objectTransform(object)
  // The scene owns the transform; models only draw themselves at the origin.
  return (
    <group name={id} position={position} rotation={rotation}>
      <Component size={object.size} color={object.color} />
    </group>
  )
}

export default function Objects() {
  // Only the ids: the list re-renders when objects are added or removed.
  const ids = useObjectsStore(useShallow((state) => state.objects.map((object) => object.id)))

  return ids.map((id) => <SceneObject key={id} id={id} />)
}
