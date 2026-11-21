// A preview card for one choice with a picture and a name (K.1.6), e.g. a room
// shape. The chosen one has a sage outline, a tinted fill and a check.
// `icon` is the picture, `label` the name, `title` the tooltip. Without
// `pressed` it is a plain button; `disabled` greys it out.
export default function ShapeCard({ icon, label, title, pressed, disabled = false, onClick }) {
  return (
    <button
      type="button"
      className={pressed ? 'ui-shape-card active' : 'ui-shape-card'}
      aria-pressed={pressed}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      {pressed && (
        <svg className="ui-shape-card-check" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      )}
      {icon}
      <span>{label}</span>
    </button>
  )
}
