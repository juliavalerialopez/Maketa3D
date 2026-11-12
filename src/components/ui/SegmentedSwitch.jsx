// Shared segmented switch: one button per option, the current one highlighted.
// options: [{ value, label, disabled?, title? }]. `label` names the group for
// screen readers. `size` is 'normal' (default, e.g. the top bar) or 'small'
// (inside a card or over the scene). `stretch` makes the options share the
// whole width the parent gives the switch (e.g. icon options in a panel).
export default function SegmentedSwitch({ options, value, onChange, label, size = 'normal', stretch = false }) {
  const classes = ['ui-segmented']
  if (size === 'small') classes.push('small')
  if (stretch) classes.push('stretch')
  return (
    <div className={classes.join(' ')} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'ui-segmented-option selected' : 'ui-segmented-option'}
          aria-pressed={option.value === value}
          disabled={option.disabled}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
