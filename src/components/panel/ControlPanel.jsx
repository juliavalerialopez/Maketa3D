import Section from './Section'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import { useObjectsStore } from '../../store/objectsStore'

export default function ControlPanel() {
  const addObject = useObjectsStore((state) => state.addObject)

  return (
    <div className="control-panel">
      <Section title="Room configuration">
        <RoomInputs />
      </Section>
      <Section title="Objects">
        <button type="button" className="panel-button" onClick={() => addObject('sofa')}>
          Add Sofa
        </button>
        <ObjectList />
      </Section>
    </div>
  )
}
