// Shared action button for the panel. With `pressed` (true or false) it acts
// as a toggle: aria-pressed is set and the pressed state is highlighted.
export default function Button({ onClick, pressed, children }) {
  const className = pressed ? 'ui-button pressed' : 'ui-button'
  return (
    <button type="button" className={className} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}
