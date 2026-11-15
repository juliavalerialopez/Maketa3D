import { useRoomStore } from '../../store/roomStore'
import { useObjectsStore } from '../../store/objectsStore'
import { openingLabel, openingsOf } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import ListItem from '../ui/ListItem'

// The room's doors and windows as a list ("Door 1", "Window 1"), in Build
// (J.8) and Plan (J.9.1). A click selects one (and lets go of any furniture,
// J.9.1); a click on the selected one lets it go. Nothing when there are none.
export default function OpeningList() {
  const room = useRoomStore((state) => state.room)
  const selectedId = useUiStore((state) => state.selectedOpening)
  const openings = openingsOf(room)
  if (openings.length === 0) return null

  function select(id) {
    if (id) useObjectsStore.getState().selectObject(null)
    useUiStore.getState().selectOpening(id)
  }

  return (
    <ul className="ui-list">
      {openings.map((opening) => (
        <ListItem
          key={opening.id}
          label={openingLabel(room, opening)}
          selected={opening.id === selectedId}
          onClick={() => select(opening.id === selectedId ? null : opening.id)}
        />
      ))}
    </ul>
  )
}
