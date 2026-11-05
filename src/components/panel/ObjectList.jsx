import { useShallow } from 'zustand/react/shallow'
import { useObjectsStore } from '../../store/objectsStore'
import { CAMERA_ID } from '../../store/cameraStore'
import { objectLabel } from '../objects/catalog'
import ListItem from '../ui/ListItem'
import HideButton from './HideButton'

export default function ObjectList() {
  // Ids, labels and hidden flags only: moving or recoloring an object doesn't
  // re-render the list.
  const ids = useObjectsStore(useShallow((state) => state.objects.map((object) => object.id)))
  const labels = useObjectsStore(useShallow((state) => state.objects.map(objectLabel)))
  const hiddenFlags = useObjectsStore(useShallow((state) => state.objects.map((object) => Boolean(object.hidden))))
  const selectedId = useObjectsStore((state) => state.selectedId)
  const selectObject = useObjectsStore((state) => state.selectObject)

  // The placeable camera (I.14) is always first; it has no Hide switch.
  const cameraRow = (
    <ListItem
      label="Camera"
      selected={selectedId === CAMERA_ID}
      onClick={() => selectObject(selectedId === CAMERA_ID ? null : CAMERA_ID)}
    />
  )

  return (
    <ul className="ui-list">
      {cameraRow}
      {ids.length === 0 && (
        <li>
          <p className="panel-placeholder">No objects yet.</p>
        </li>
      )}
      {ids.map((id, index) => (
        <ListItem
          key={id}
          label={labels[index]}
          selected={id === selectedId}
          muted={hiddenFlags[index]}
          // Clicking the selected item again deselects it.
          onClick={() => selectObject(id === selectedId ? null : id)}
          action={<HideButton object={{ id, hidden: hiddenFlags[index] }} name={labels[index]} />}
        />
      ))}
    </ul>
  )
}
