// Where an L's cut-out is (K.1.8): a small floor plan of four corners, seen
// from above with the front wall at the bottom (as in 2D and Build), so it
// never depends on the 3D camera. The corner chosen is the cut-out. Buttons in
// reading order; `notch` is the index into NOTCH_CORNERS (0 front right, 1
// front left, 2 back left, 3 back right).
const CORNERS = [
  { notch: 2, name: 'top left' },
  { notch: 3, name: 'top right' },
  { notch: 1, name: 'bottom left' },
  { notch: 0, name: 'bottom right' },
]

const Check = (
  <svg className="corner-picker-check" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
)

export default function CornerPicker({ notch, onChoose }) {
  return (
    <div className="corner-picker-row">
      <span className="corner-picker-label">Corner</span>
      <div className="corner-picker" role="group" aria-label="Corner of the cut-out">
        {CORNERS.map(({ notch: index, name }) => (
          <button
            key={index}
            type="button"
            className={index === notch ? 'corner-picker-button on' : 'corner-picker-button'}
            aria-pressed={index === notch}
            aria-label={`Cut-out in the ${name} corner`}
            title={`Cut-out in the ${name} corner`}
            onClick={() => onChoose(index)}
          >
            {index === notch && Check}
          </button>
        ))}
        <span className="corner-picker-front">Front</span>
      </div>
    </div>
  )
}
