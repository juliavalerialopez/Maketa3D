// Shared clickable list row for the panel. Use inside a <ul className="ui-list">.
// The dot is filled with the accent on the selected row. `action` is an
// optional small control shown at the row's right end (e.g. an IconButton);
// it sits next to the row button, not inside it. `muted` fades the label
// (e.g. a hidden object).
export default function ListItem({ label, selected = false, onClick, action, muted = false }) {
  const classes = ['ui-list-item']
  if (selected) classes.push('selected')
  if (muted) classes.push('muted')
  return (
    <li className={action ? 'ui-list-row' : undefined}>
      <button type="button" className={classes.join(' ')} aria-pressed={selected} onClick={onClick}>
        <span className="ui-list-item-dot" aria-hidden="true" />
        {label}
      </button>
      {action}
    </li>
  )
}
