import { useState } from 'react'
import RoomInputs from './RoomInputs'

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
  return (
    <div className="control-panel">
      <Section title="Room configuration">
        <RoomInputs />
      </Section>
      <Section title="Objects">
        <p className="panel-placeholder">No objects yet.</p>
      </Section>
    </div>
  )
}
