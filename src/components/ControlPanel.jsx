import { useState } from 'react'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import { useObjectsStore } from '../store/objectsStore'

function Section({ title, children }) {
  const [open, setOpen] = useState(true)

  return (
    <section className="panel-section">
      <button
        type="button"
        className="panel-section-header"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="panel-section-arrow">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="panel-section-body">{children}</div>}
    </section>
  )
}

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
