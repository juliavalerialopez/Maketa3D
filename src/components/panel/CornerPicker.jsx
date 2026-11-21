// Where an L's cut-out is (K.1.8, K.1.18): a row of four small buttons, each
// with a tiny L whose cut-out is in that corner, seen from above with the
// front wall at the bottom (as in 2D), so it never depends on the 3D camera.
// In reading order; `notch` is the index into NOTCH_CORNERS (0 front right, 1
// front left, 2 back left, 3 back right).
const CORNERS = [
  { notch: 2, name: 'top left', flip: [-1, -1] },
  { notch: 3, name: 'top right', flip: [1, -1] },
  { notch: 1, name: 'bottom left', flip: [-1, 1] },
  { notch: 0, name: 'bottom right', flip: [1, 1] },
]

// An L with the cut-out at the bottom right, mirrored into the corner.
function Icon({ flip: [sx, sy] }) {
  return (
    <svg className="corner-picker-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 3h14v8h-7v6H3z" transform={`translate(10 10) scale(${sx} ${sy}) translate(-10 -10)`} />
    </svg>
  )
}

export default function CornerPicker({ notch, onChoose }) {
  return (
    <div className="corner-picker-row">
      <span className="corner-picker-label">Corner</span>
      <div className="corner-picker" role="group" aria-label="Corner of the cut-out">
        {CORNERS.map(({ notch: index, name, flip }) => (
          <button
            key={index}
            type="button"
            className={index === notch ? 'corner-picker-button on' : 'corner-picker-button'}
            aria-pressed={index === notch}
            aria-label={`Cut-out in the ${name} corner`}
            title={`Cut-out in the ${name} corner`}
            onClick={() => onChoose(index)}
          >
            <Icon flip={flip} />
          </button>
        ))}
      </div>
    </div>
  )
}
