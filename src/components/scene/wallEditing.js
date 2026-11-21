import { useEffect } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { findWall } from '../../store/roomShape'
import { useUiStore } from '../../store/uiStore'

// What Build's walls and Plan's 2D walls share (WallEditor.jsx).

// Walls drawn flat and dark, thicker than in 3D so they read from above
// (Build). Outward from the inside edge, so the room's inside size is the
// same.
export const BUILD_WALL_THICKNESS = 0.12
export const WALL_DRAW_HEIGHT = 0.02

// One wall is dragged at a time; meanwhile the others ignore the pointer.
let wallDragActive = false
export const isWallDragActive = () => wallDragActive
export const setWallDragActive = (active) => {
  wallDragActive = active
}

// A selected wall that no longer exists (undo, New, Open, merged back in
// line) is let go, so it does not come back later by chance. The same for a
// door or window that is gone (J.8).
export function useStaleSelection(corners, openings, selection) {
  useEffect(() => {
    const { selectedWall, selectWall, selectedOpening, selectOpening } = useUiStore.getState()
    const { room } = useRoomStore.getState()
    if (selectedOpening && !room.openings?.some((opening) => opening.id === selectedOpening)) selectOpening(null)
    if (!selectedWall || wallDragActive) return
    if (findWall(room.corners, selectedWall.a, selectedWall.b) === -1) selectWall(null)
  }, [corners, openings, selection])
}
