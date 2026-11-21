// The switch between Width and Depth (K.1.7): on, the two stay equal. A chain
// icon on a button that is filled and outlined while on; `label` names it for
// screen readers and is its tooltip.
export default function LinkToggle({ checked, onChange, label }) {
  return (
    <div className="link-toggle-row">
      <button
        type="button"
        className={checked ? 'link-toggle on' : 'link-toggle'}
        aria-pressed={checked}
        aria-label={label}
        title={label}
        onClick={() => onChange(!checked)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
      </button>
      <span className="link-toggle-text">{checked ? 'Width and depth stay equal' : 'Width and depth are separate'}</span>
    </div>
  )
}
