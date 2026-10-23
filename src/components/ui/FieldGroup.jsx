// Shared group of number fields shown side by side, e.g. Location X and Z.
// Children are compact NumberFields; the unit is shown once, next to the title.
export default function FieldGroup({ title, unit, children }) {
  return (
    <div className="ui-field-group">
      <div className="ui-field-group-title">
        <span>{title}</span>
        {unit && <span className="ui-field-group-unit">{unit}</span>}
      </div>
      <div className="ui-field-group-row">{children}</div>
    </div>
  )
}
