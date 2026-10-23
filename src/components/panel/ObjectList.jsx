import { useShallow } from 'zustand/react/shallow'
import { useObjectsStore } from '../../store/objectsStore'
import { objectLabel } from '../objects/catalog'
import ListItem from '../ui/ListItem'

export default function ObjectList() {
  // Ids and labels only: moving or recoloring an object doesn't re-render the list.
  const ids = useObjectsStore(useShallow((state) => state.objects.map((object) => object.id)))
  const labels = useObjectsStore(useShallow((state) => state.objects.map(objectLabel)))
  const selectedId = useObjectsStore((state) => state.selectedId)
  const selectObject = useObjectsStore((state) => state.selectObject)

  if (ids.length === 0) {
    return <p className="panel-placeholder">No objects yet.</p>
  }

  return (
    <ul className="ui-list">
      {ids.map((id, index) => (
        <ListItem
          key={id}
          label={labels[index]}
          selected={id === selectedId}
          // Clicking the selected item again deselects it.
          onClick={() => selectObject(id === selectedId ? null : id)}
        />
      ))}
    </ul>
  )
}
