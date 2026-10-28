// Shared action button for the panel. With `pressed` (true or false) it acts
// as a toggle: aria-pressed is set and the pressed state is highlighted.
// `disabled` greys it out and ignores clicks.
export default function Button({ onClick, pressed, disabled = false, children }) {
  const className = pressed ? 'ui-button pressed' : 'ui-button'
  return (
    <button type="button" className={className} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
