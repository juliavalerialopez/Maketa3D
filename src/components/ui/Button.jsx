// Shared action button for the panel, a pill. `variant` is 'secondary' (the
// default) or 'primary' (filled with the accent, for the main action of a
// group). With `pressed` (true or false) it acts as a toggle: aria-pressed is
// set and the pressed state is shown. `disabled` greys it out and ignores clicks.
export default function Button({ onClick, pressed, disabled = false, variant = 'secondary', children }) {
  const classes = ['ui-button', variant]
  if (pressed) classes.push('pressed')
  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
