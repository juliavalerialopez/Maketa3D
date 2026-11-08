import IconButton from './IconButton'

// Shared image thumbnail: click to select it (pressed look when `selected`).
// With `onDelete`, a small round X sits at a top corner (`deleteCorner`,
// 'left' by default, or 'right'), shown only while the pointer is over the
// thumbnail or it has keyboard focus. `action` is an optional small control
// (e.g. an IconButton) always shown at the top left.
// `size` is 'small' (default, the version strip) or 'large' (camera slots).
// Without `src` the thumbnail is an empty, pressed-in tile showing
// `placeholder` (e.g. a big plus). `label` is the button's accessible name
// when the image alone does not say what a click does.
export default function Thumbnail({
  src,
  alt = '',
  selected = false,
  onSelect,
  onDelete,
  deleteLabel = 'Delete',
  deleteCorner = 'left',
  action,
  size = 'small',
  placeholder,
  label,
}) {
  const classes = ['ui-thumbnail', size]
  if (selected) classes.push('selected')
  const imageClasses = src ? 'ui-thumbnail-image' : 'ui-thumbnail-image empty'
  return (
    <div className={classes.join(' ')}>
      <button type="button" className={imageClasses} aria-pressed={selected} aria-label={label} onClick={onSelect}>
        {src ? <img src={src} alt={alt} draggable={false} /> : placeholder}
      </button>
      {action && <div className="ui-thumbnail-action">{action}</div>}
      {onDelete && (
        <IconButton label={deleteLabel} size="small" className={`ui-thumbnail-delete ${deleteCorner}`} onClick={onDelete}>
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </IconButton>
      )}
    </div>
  )
}
