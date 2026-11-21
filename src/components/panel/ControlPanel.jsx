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
import { OPENING_TYPES } from '../../store/openings'
import { TOOL_NOTICES, TOOL_NOTICES_3D } from './toolNotices'

export default function ControlPanel() {
  const addObject = useObjectsStore((state) => state.addObject)
  // Only the id: editing the selected object must not re-render the whole panel.
  const selectedId = useObjectsStore((state) => state.selectedId)
  // Doors and windows (J.9.1): how many, and the selected one while it exists.
  const openingCount = useRoomStore((state) => state.room.openings?.length ?? 0)
  const selectedOpening = useUiStore((state) => state.selectedOpening)
  const openingExists = useRoomStore((state) => Boolean(state.room.openings?.some((item) => item.id === selectedOpening)))
  const tool = useUiStore((state) => state.tool)
  const sceneView = useUiStore((state) => state.sceneView)
  useObjectShortcuts()

  // Door and Window start the placing tools (J.9.4), in the 2D and 3D views; a
  // second press turns it off. Nothing stays selected meanwhile.
  function togglePlacing(type) {
    useObjectsStore.getState().selectObject(null)
    const ui = useUiStore.getState()
    ui.selectOpening(null)
    ui.setTool(tool === type ? null : type)
  }

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
        <p className="panel-group-title">Openings</p>
        <div className="add-buttons">
          {['door', 'window'].map((type) => (
            <Button key={type} onClick={() => togglePlacing(type)} pressed={tool === type} disabled={sceneView === 'walk'}>
              {OPENING_TYPES[type].label}
            </Button>
          ))}
        </div>
        {tool && <p className="panel-notice">{(sceneView === '3d' ? TOOL_NOTICES_3D : TOOL_NOTICES)[tool]}</p>}
        {openingCount > 0 && <OpeningList />}
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
