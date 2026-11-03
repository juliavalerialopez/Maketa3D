// Shared round icon button in the soft style. `label` is required: it is
// the accessible name and the tooltip, since the button shows only an icon.
// `size` is 'normal' (default) or 'small'. Extra class names go in `className`
// (e.g. for positioning by the parent).
export default function IconButton({ label, onClick, size = 'normal', className, children }) {
  const classes = ['ui-icon-button', size]
  if (className) classes.push(className)
  return (
    <button type="button" className={classes.join(' ')} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}
