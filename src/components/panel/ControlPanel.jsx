import Section from './Section'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import Button from '../ui/Button'
import useObjectShortcuts from './useObjectShortcuts'
import { useObjectsStore } from '../../store/objectsStore'

export default function ControlPanel() {
  const addObject = useObjectsStore((state) => state.addObject)
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
    </div>
  )
}
