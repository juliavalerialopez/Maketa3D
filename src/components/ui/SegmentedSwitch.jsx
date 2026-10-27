// Shared segmented switch: one button per option, the current one highlighted.
// options: [{ value, label }]
export default function SegmentedSwitch({ options, value, onChange }) {
  return (
    <div className="ui-segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'ui-segmented-option selected' : 'ui-segmented-option'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
