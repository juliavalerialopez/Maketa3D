import { useState } from 'react'

export default function Section({ title, children }) {
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
