import { MIN_CUT_WALL } from '../../store/roomShape'

// What to do while a tool is on: Build's wall tools (J.7.1, J.8.1, J.8.2) and
// the same Door and Window in Plan (J.9.4).
export const TOOL_NOTICES = {
  cut: `Click on a wall where it should be split in two (walls of ${MIN_CUT_WALL} m or more). Esc cancels.`,
  door: 'Click near a wall to place the door. Esc cancels.',
  window: 'Click on a wall where the window starts, then where it ends. Esc cancels.',
}

// In Plan's 3D view a wall is pointed at, not the floor.
export const TOOL_NOTICES_3D = {
  ...TOOL_NOTICES,
  door: 'Click on a wall to place the door. Esc cancels.',
}
