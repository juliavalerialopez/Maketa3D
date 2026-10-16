import { useObjectsStore } from '../../store/objectsStore'
import { objectLabel } from '../objects/catalog'
import ListItem from '../ui/ListItem'

export default function ObjectList() {
  const objects = useObjectsStore((state) => state.objects)

  if (objects.length === 0) {
    return <p className="panel-placeholder">No objects yet.</p>
  }

  return (
    <ul className="ui-list">
      {objects.map((object) => (
        <ListItem key={object.id} label={objectLabel(object)} />
      ))}
    </ul>
  )
}
