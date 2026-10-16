// Shared action button for the panel.
export default function Button({ onClick, children }) {
  return (
    <button type="button" className="ui-button" onClick={onClick}>
      {children}
    </button>
  )
}
