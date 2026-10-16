import Section from './Section'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import ObjectDetails from './ObjectDetails'
import Button from '../ui/Button'
import useObjectShortcuts from './useObjectShortcuts'
import { useObjectsStore } from '../../store/objectsStore'

export default function ControlPanel() {
  const addObject = useObjectsStore((state) => state.addObject)
  const selected = useObjectsStore((state) =>
    state.objects.find((object) => object.id === state.selectedId),
  )
  useObjectShortcuts()

  return (
    <div className="control-panel">
      <Section title="Room configuration">
        <RoomInputs />
      </Section>
      <Section title="Objects">
        <Button onClick={() => addObject('sofa')}>Add Sofa</Button>
        <ObjectList />
      </Section>
      {selected && (
        // Keyed by id: a new selection reopens the section and refills its fields.
        <Section key={selected.id} title="Object details">
          <ObjectDetails object={selected} />
        </Section>
      )}
    </div>
  )
}
