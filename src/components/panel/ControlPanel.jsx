import { useEffect } from 'react'
import Section from './Section'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import ObjectDetails from './ObjectDetails'
import OpeningDetails from './OpeningDetails'
import Button from '../ui/Button'
import useObjectShortcuts from './useObjectShortcuts'
import { useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { OBJECT_TYPES } from '../objects/catalog'

export default function ControlPanel() {
  const addObject = useObjectsStore((state) => state.addObject)
  // Only the id: editing the selected object must not re-render the whole panel.
  const selectedId = useObjectsStore((state) => state.selectedId)
  // The selected door or window (J.9.1), while it exists. Plan has no buttons
  // to add them (K.1.9): they are added in Build, and selected here by a click
  // in the view.
  const selectedOpening = useUiStore((state) => state.selectedOpening)
  const openingExists = useRoomStore((state) => Boolean(state.room.openings?.some((item) => item.id === selectedOpening)))
  useObjectShortcuts()

  // A piece of furniture and an opening are never selected together (J.9.1):
  // furniture selected any way (list, view, Add, Duplicate) lets the opening go.
  useEffect(
    () =>
      useObjectsStore.subscribe((state, previous) => {
        if (state.selectedId && state.selectedId !== previous.selectedId) useUiStore.getState().selectOpening(null)
      }),
    [],
  )

  return (
    <div className="control-panel">
      <Section id="room" title="Room configuration">
        <RoomInputs />
      </Section>
      <Section id="objects" title="Objects">
        <div className="add-buttons">
          {Object.entries(OBJECT_TYPES).map(([type, { label }]) => (
            <Button key={type} onClick={() => addObject(type)}>
              {label}
            </Button>
          ))}
        </div>
        <ObjectList />
      </Section>
      {selectedId && (
        // Keyed by id: a new selection reopens the section and refills its fields.
        <Section key={selectedId} title="Object details">
          <ObjectDetails />
        </Section>
      )}
      {!selectedId && openingExists && (
        <Section key={selectedOpening} title="Object details">
          <OpeningDetails id={selectedOpening} />
        </Section>
      )}
    </div>
  )
}
