import { useObjectsStore } from '../../store/objectsStore'
import { OBJECT_TYPES } from '../objects/catalog'

export default function Objects() {
  const objects = useObjectsStore((state) => state.objects)

  return objects.map((object) => {
    const Component = OBJECT_TYPES[object.type].component
    return (
      <Component
        key={object.id}
        position={object.position}
        rotation={object.rotation}
        size={object.size}
        color={object.color}
      />
    )
  })
}
