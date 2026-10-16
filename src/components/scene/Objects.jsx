import { useObjectsStore } from '../../store/objectsStore'
import Sofa from '../objects/Sofa'

const COMPONENTS = {
  sofa: Sofa,
}

export default function Objects() {
  const objects = useObjectsStore((state) => state.objects)

  return objects.map((object) => {
    const Component = COMPONENTS[object.type]
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
