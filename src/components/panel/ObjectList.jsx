import { useObjectsStore } from '../../store/objectsStore'
import { OBJECT_TYPES } from '../objects/catalog'
import ListItem from '../ui/ListItem'

export default function ObjectList() {
  const objects = useObjectsStore((state) => state.objects)

  if (objects.length === 0) {
    return <p className="panel-placeholder">No objects yet.</p>
  }

  // Number objects per type in the order they were added: "Sofa 1", "Sofa 2", ...
  const counts = {}
  const items = objects.map((object) => {
    counts[object.type] = (counts[object.type] ?? 0) + 1
    return { id: object.id, label: `${OBJECT_TYPES[object.type].label} ${counts[object.type]}` }
  })

  return (
    <ul className="ui-list">
      {items.map((item) => (
        <ListItem key={item.id} label={item.label} />
      ))}
    </ul>
  )
}
