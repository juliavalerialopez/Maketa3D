// Shared color input for the panel. React fires onChange on every input
// event, so onChange runs live while the user drags in the picker.
export default function ColorField({ label, value, onChange }) {
  return (
    <label className="ui-color-field">
      <span className="ui-color-field-label">{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
