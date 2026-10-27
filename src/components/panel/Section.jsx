import { useState } from 'react'
import { useUiStore } from '../../store/uiStore'

// Collapsible panel section, open by default. With an `id`, the open state is
// kept in uiStore and survives a mode switch; without one it is local.
export default function Section({ id, title, children }) {
  const storedOpen = useUiStore((state) => (id ? state.openSections[id] : undefined))
  const setSectionOpen = useUiStore((state) => state.setSectionOpen)
  const [localOpen, setLocalOpen] = useState(true)

  const open = id ? (storedOpen ?? true) : localOpen
  const toggle = () => (id ? setSectionOpen(id, !open) : setLocalOpen(!open))

  return (
    <section className="panel-section">
      <button type="button" className="panel-section-header" aria-expanded={open} onClick={toggle}>
        <span className="panel-section-arrow">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="panel-section-body">{children}</div>}
    </section>
  )
}
