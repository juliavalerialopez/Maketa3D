import { useEffect, useId, useRef, useState } from 'react'

// A button that opens a small menu below it. `items` is a list of
// { label, onSelect, disabled }. Choosing an item closes the menu and calls
// onSelect; disabled items are greyed out and skipped.
// - `title`: optional small heading at the top of the menu.
// - `variant`: 'pill' (default, a secondary pill button) or 'plain' (no
//   button look; the label keeps the surrounding text style, e.g. a logo).
// - `icon`: when given, the button is a round IconButton-style button showing
//   only this icon; `label` becomes its accessible name and tooltip.
// - `className`: extra classes on the wrapper (e.g. for positioning).
// - `align`: 'start' (menu's left edge under the button) or 'end' (default).
// Closes on Escape (focus goes back to the button) and on a press outside.
// Arrow Up and Down move between items; the first item is focused on open.
export default function MenuButton({ label, items, title, variant = 'pill', align = 'end', icon, className }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])

  // The enabled items' buttons, in order.
  const enabledItems = () => itemRefs.current.filter((element) => element && !element.disabled)

  useEffect(() => {
    if (!open) return
    enabledItems()[0]?.focus()
    function handlePointerDown(event) {
      if (!rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function close() {
    setOpen(false)
    buttonRef.current.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (!open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    event.preventDefault()
    const enabled = enabledItems()
    if (enabled.length === 0) return
    const current = enabled.indexOf(document.activeElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    const next = current === -1 ? 0 : (current + step + enabled.length) % enabled.length
    enabled[next].focus()
  }

  function choose(item) {
    close()
    item.onSelect()
  }

  let look = 'ui-button secondary'
  if (icon) look = 'ui-icon-button normal'
  else if (variant === 'plain') look = 'plain'
  const buttonClasses = ['ui-menu-button-trigger', look]
  if (open && variant !== 'plain') buttonClasses.push('pressed')

  return (
    <div
      className={className ? `ui-menu-button ${className}` : 'ui-menu-button'}
      ref={rootRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        className={buttonClasses.join(' ')}
        aria-label={icon ? label : undefined}
        title={icon ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
      >
        {icon ?? (
          <>
            {label}
            <span className="ui-menu-button-caret" aria-hidden="true">▾</span>
          </>
        )}
      </button>
      {open && (
        <div className={`ui-menu ${align}`} id={menuId} role="menu" aria-label={title ?? label}>
          {title && (
            <div className="ui-menu-title" role="presentation">
              {title}
            </div>
          )}
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => (itemRefs.current[index] = element)}
              type="button"
              role="menuitem"
              className="ui-menu-item"
              disabled={item.disabled}
              onClick={() => choose(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
