// Shared segmented switch: one button per option, the current one highlighted.
// options: [{ value, label }]. `label` names the group for screen readers.
// `size` is 'normal' (default, e.g. the top bar) or 'small' (inside a card).
export default function SegmentedSwitch({ options, value, onChange, label, size = 'normal' }) {
  return (
    <div className={size === 'small' ? 'ui-segmented small' : 'ui-segmented'} role="group" aria-label={label}>
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
