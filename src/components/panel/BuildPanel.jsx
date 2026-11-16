import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { findWall, roomWalls } from '../../store/roomShape'
import Section from './Section'
import RoomInputs from './RoomInputs'
import WallLengthField from './WallLengthField'
import OpeningsSection from './OpeningsSection'

// Build's control panel (J.5, J.7, J.8): Room configuration (shape buttons and
// all the room's sizes, as in Plan, J.5.4), with a wall selected its length,
// and Wall tools (Cut, Door, Window and the doors and windows, J.7.1).
export default function BuildPanel() {
  const corners = useRoomStore((state) => state.room.corners)
  const selected = useUiStore((state) => state.selectedWall)
  const index = selected ? findWall(corners, selected.a, selected.b) : -1

  return (
    <div className="control-panel">
      <Section id="room" title="Room configuration">
        <RoomInputs inBuild />
      </Section>
      {index !== -1 && (
        <Section key={index} id="wall" title={`Wall ${index + 1}`}>
          <div className="field-stack">
            <WallLengthField index={index} wall={roomWalls(corners)[index]} />
          </div>
        </Section>
      )}
      <Section id="openings" title="Wall tools">
        <OpeningsSection />
      </Section>
    </div>
  )
}
