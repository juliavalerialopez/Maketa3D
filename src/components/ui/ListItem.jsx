// Shared clickable list row for the panel. Use inside a <ul className="ui-list">.
export default function ListItem({ label, selected = false, onClick }) {
  return (
    <li>
      <button
        type="button"
        className={selected ? 'ui-list-item selected' : 'ui-list-item'}
        aria-pressed={selected}
        onClick={onClick}
      >
        {label}
      </button>
    </li>
  )
}
