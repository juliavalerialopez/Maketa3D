// Shared clickable list row for the panel. Use inside a <ul className="ui-list">.
// The dot is filled with the accent on the selected row.
export default function ListItem({ label, selected = false, onClick }) {
  return (
    <li>
      <button
        type="button"
        className={selected ? 'ui-list-item selected' : 'ui-list-item'}
        aria-pressed={selected}
        onClick={onClick}
      >
        <span className="ui-list-item-dot" aria-hidden="true" />
        {label}
      </button>
    </li>
  )
}
