import Section from './Section'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import ObjectDetails from './ObjectDetails'
import Button from '../ui/Button'
import useObjectShortcuts from './useObjectShortcuts'
import { useObjectsStore } from '../../store/objectsStore'
import { OBJECT_TYPES } from '../objects/catalog'

export default function ControlPanel() {
  const addObject = useObjectsStore((state) => state.addObject)
  // Only the id: editing the selected object must not re-render the whole panel.
  const selectedId = useObjectsStore((state) => state.selectedId)
  useObjectShortcuts()

  return (
    <div className="control-panel">
      <Section id="room" title="Room configuration">
        <RoomInputs />
      </Section>
      <Section id="objects" title="Objects">
        <div className="add-buttons">
          {Object.entries(OBJECT_TYPES).map(([type, { label }]) => (
            <Button key={type} onClick={() => addObject(type)}>
              {label}
            </Button>
          ))}
        </div>
        <ObjectList />
      </Section>
      {selectedId && (
        // Keyed by id: a new selection reopens the section and refills its fields.
        <Section key={selectedId} title="Object details">
          <ObjectDetails />
        </Section>
      )}
    </div>
  )
}
