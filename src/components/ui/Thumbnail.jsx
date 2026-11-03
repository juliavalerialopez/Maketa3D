import IconButton from './IconButton'

// Shared image thumbnail: click to select it (pressed look when `selected`).
// With `onDelete`, a small round X sits at its top left, shown only while
// the pointer is over the thumbnail or it has keyboard focus.
export default function Thumbnail({ src, alt, selected = false, onSelect, onDelete, deleteLabel = 'Delete' }) {
  return (
    <div className={selected ? 'ui-thumbnail selected' : 'ui-thumbnail'}>
      <button type="button" className="ui-thumbnail-image" aria-pressed={selected} onClick={onSelect}>
        <img src={src} alt={alt} draggable={false} />
      </button>
      {onDelete && (
        <IconButton label={deleteLabel} size="small" className="ui-thumbnail-delete" onClick={onDelete}>
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </IconButton>
      )}
    </div>
  )
}
