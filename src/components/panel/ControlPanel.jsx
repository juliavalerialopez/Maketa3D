import { useEffect } from 'react'
import Section from './Section'
import RoomInputs from './RoomInputs'
import ObjectList from './ObjectList'
import ObjectDetails from './ObjectDetails'
import OpeningList from './OpeningList'
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
  // Doors and windows (J.9.1): how many, and the selected one while it exists.
  const openingCount = useRoomStore((state) => state.room.openings?.length ?? 0)
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
        {openingCount > 0 && (
          <>
            <p className="panel-group-title">Openings</p>
            <OpeningList />
          </>
        )}
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
