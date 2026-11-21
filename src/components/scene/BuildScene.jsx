import { useEffect, useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { findWall } from '../../store/roomShape'
import { useUiStore } from '../../store/uiStore'
import BuildOpenings from './BuildOpenings'
import PlaceOpening from './PlaceOpening'
import WallBar from './WallBar'
import OpeningDistances from './OpeningDistances'
import { focusIsFree, runHistoryKey } from '../panel/useObjectShortcuts'
import Floor from './Floor'
import RoomGrid from './RoomGrid'
import RoomDimensions from './RoomDimensions'
import WallDimensions from './WallDimensions'
import { wallBoxes } from './wallBoxes'
import { EditableWall } from './WallEditor'
import { BUILD_WALL_THICKNESS, WALL_DRAW_HEIGHT, useStaleSelection } from './wallEditing'

// How far outside a wall its dimension line (its length, J.5.3) sits, in
// meters, beyond the wall's own thickness. The length is typed in the panel,
// once the wall is selected (J.5.1).
const DIMENSION_GAP = 0.35

// The Build view (J.5): the room from above, flat, with no light or shadow:
// the floor in its color, the walls dark, each wall's length next to it.
// Furniture is not shown. Walls can be selected and dragged (J.6), cut in
// two at a point (J.7.1), and get a door or window (J.8.1, J.8.2); the
// selected wall shows a bar with those tools (J.8.3), except while it is
// dragged or a tool is on. Esc turns the tool off, then clears the
// selection.
export default function BuildScene() {
  const { corners, openings } = useRoomStore((state) => state.room)
  const selection = useUiStore((state) => state.selectedWall)
  const tool = useUiStore((state) => state.tool)
  const highlightedWalls = useUiStore((state) => state.highlightedWalls)
  // Height: seen from above, a wall's top edge is the whole wall.
  const highlightedTop = useUiStore((state) => state.highlightedTop)
  const walls = wallBoxes(corners, WALL_DRAW_HEIGHT, BUILD_WALL_THICKNESS)
  const selectedIndex = selection ? findWall(corners, selection.a, selection.b) : -1
  // A wall is being dragged (J.8.3: the bar hides meanwhile).
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      // Undo and redo (J.10), as in Plan, unless a menu or dialog is open.
      if (!event.defaultPrevented && !document.querySelector('dialog[open], [role="menu"]') && runHistoryKey(event)) return
      // A field being typed in keeps Esc; a focused button (Cut) does not.
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      const ui = useUiStore.getState()
      // Delete or Backspace removes the selected door or window (J.8), only
      // with the focus on the page or the view.
      const { room, removeOpening } = useRoomStore.getState()
      const opening = room.openings?.find((item) => item.id === ui.selectedOpening)
      if ((event.key === 'Delete' || event.key === 'Backspace') && opening && focusIsFree()) {
        event.preventDefault()
        removeOpening(opening.id)
        ui.selectOpening(null)
        return
      }
      if (event.key !== 'Escape' || typing) return
      if (ui.tool) ui.setTool(null)
      else if (ui.selectedWall) ui.selectWall(null)
      else if (ui.selectedOpening) ui.selectOpening(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useStaleSelection(corners, openings, selection)

  return (
    <>
      <Floor flat />
      <RoomGrid />
      {/* Only the area: each wall's length is already written next to it. */}
      <RoomDimensions gap={0} withLines={false} />
      {walls.map((box, index) => (
        <EditableWall
          key={index}
          index={index}
          box={box}
          selected={index === selectedIndex}
          highlighted={highlightedTop || highlightedWalls.includes(index)}
          cutting={tool === 'cut'}
          onDragChange={setDragging}
        />
      ))}
      <WallDimensions offset={BUILD_WALL_THICKNESS + DIMENSION_GAP} />
      <BuildOpenings thickness={BUILD_WALL_THICKNESS} />
      <OpeningDistances fromAbove />
      {selectedIndex !== -1 && !tool && !dragging && <WallBar wall={walls[selectedIndex].wall} />}
      {(tool === 'door' || tool === 'window') && (
        <PlaceOpening key={tool} type={tool} thickness={BUILD_WALL_THICKNESS} />
      )}
    </>
  )
}
