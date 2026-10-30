// Shared on/off switch: a pressed pill track with a raised round knob that
// slides right when on. `label` is for screen readers; `before` and `after`
// are optional small icons on either side.
export default function Toggle({ label, checked, onChange, before, after }) {
  return (
    <div className="ui-toggle">
      {before}
      <button
        type="button"
        role="switch"
        className={checked ? 'ui-toggle-track on' : 'ui-toggle-track'}
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      />
      {after}
    </div>
  )
}
