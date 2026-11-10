# Part J: Build the room, openings, shortcuts

Status: **In progress**. Builds on Part A (room), Part D (arrange), Part G (save and open) and Part I (history). Angled walls are Part K.

## Goal
1. I can start from a square, a rectangle or an L-shaped room, and I can reshape it in a new top view called **Build**.
2. I can add doors and windows to the walls, and fine-tune them in Plan.
3. Positions are measured from a corner of the room, like a real floor plan, and every object shows its distance to the walls.
4. A set of small fixes and keyboard shortcuts makes arranging faster (J0).

## Decisions
- Part J has two bundles. **J0** is small fixes and shortcuts that do not depend on room shape. **J** is the room itself. J0 goes first.
- The room is stored as a **closed list of corners**. Square, rectangle and L are presets of that list. In Part J every wall is horizontal or vertical. Angles come in Part K.
- Measurements are **inside** measurements, as taken with a tape from the inside. Walls are drawn with a fixed thickness outward from the inside edge. Editing thickness is out of scope.
- The **origin** is the bottom left corner of the room's bounding box (seen from above, front at the bottom). X grows to the right, Z grows toward the back. Stored positions do not change when walls move: only the numbers shown are recalculated, so furniture keeps its place in the room.
- (added 2026-11-10, code survey) Stored positions stay in world coordinates, where the front wall is at +z. So shown X = `x − minX` and shown Z = `frontZ − z` (the front wall's z minus the object's z). Old files keep their place: a 6 × 5 room imports as corners at ±3, ±2.5, and camera slots need no change. Only the shown numbers start at 0.
- (added 2026-11-10) New Project's room is a Square of 5 × 5 m, height 2.6 m (today 6 × 5).
- Part 3 is **cut and drag** (no draw-a-wall). After testing with real users I decide if drawing is better.
- **Furniture is hidden in Build.** On leaving Build, any piece outside the room is pushed to the nearest valid spot with a short notice.
- Doors and windows are **flat rectangles** on the wall, no hole in the geometry.
- The distance readout appears when an object is **selected** (no Space key).

## Out of scope
- Angled walls (Part K), drawing walls, curved walls, columns, sloped ceilings, balcony, several rooms, several floors.
- Wall thickness editing, an area label, resize handles on openings, real holes or door swings in 3D, imperial units.

## Requirements

### J0: Fixes
- **Panel minimum width.** The left panel has a minimum width at which every number in Room configuration and Object details is fully visible (about the width in my second screenshot; Claude Code measures the smallest width that works). The divider cannot go below it. (changed 2026-11-10) The minimum is **276 px**, measured by Julia.
- **Drag moves by default.** Pressing an object and moving the mouse moves it on the floor. It rotates only when I grab the rotate widget.
- **Move readout.** While I drag an object, a small label next to it shows its new position, X and Z in meters, the same numbers as Location in Object details (from the origin corner once J.2 is in). (changed 2026-11-10: the new position, not the distance moved.)
  - (added 2026-11-10) J0.3.1: after trying it, Julia wants the distance moved instead: one number per direction the object moved along the room's axes, each with an arrow showing which way it went on screen (→ ↗ ↑ ↖ ← ↙ ↓ ↘), e.g. "→ 30 cm" for a straight move and "→ 30 cm  ↑ 1.2 m" for a diagonal one. Under 1 m in centimeters, from 1 m in meters.
- **Distance to walls.** While an object is selected in Plan, a thin line with a number (meters) goes from each of its four sides to the nearest wall in that direction. For a rotated object the four sides are the extremes of its footprint along the room axes. The numbers update while dragging.
- **Duplicate.** Ctrl+D (and a Duplicate button in Object details) makes a copy 0.3 m to the side, with its own number, and selects it. Clamped inside the walls.

### J0: Shortcuts
Plan mode only unless stated. Cmd replaces Ctrl on Mac. Shortcuts are ignored while typing in a field, except Ctrl+S and Ctrl+O. Ctrl+S, Ctrl+O and Ctrl+D block the browser's own action. Delete, Backspace, Escape, the arrow keys, R and Ctrl+D act only when the focus is on the page or the 3D view, never on a field or a button.

| Shortcut | Action | Status |
|---|---|---|
| Ctrl+Z | Undo | exists (also in Build, J.9) |
| Ctrl+Shift+Z, Ctrl+Y | Redo | exists (also in Build, J.9) |
| Delete, Backspace | Delete the selected object | exists |
| Escape | Deselect | exists |
| Arrow Up / Down in a number field | Step the value | exists |
| Ctrl+S | Save the project (all modes) | new |
| Ctrl+O | Open a project (Plan and Build; like the menu, not in Personalize) | new |
| Arrow keys on a selected object | Nudge 10 cm; with Shift 1 cm | new |
| R | Switch between the move and rotate widget | new |
| Ctrl+D | Duplicate the selected object | new |
| 1, 2, 3 | Build, Plan, Personalize | new (J.9) |

- Arrow keys move relative to the screen: Left and Right move to the left and right on screen, Up moves away from the camera, Down toward it, each snapped to the nearest room axis. A move is clamped inside the walls like a drag. One held key or burst of presses is one undo step.
- Known gap fixed here: with focus on the color input or a button, Backspace and Delete must not delete the object.

### Room data
- `room: { height, corners: [{ x, z }, ...] }`, corners in order around the room, every edge horizontal or vertical. Walls are the edges between corners.
- `openings: [{ id, type: 'door' | 'window', wallIndex, offset, width, height, sill }]`. `offset` is the distance from the wall's first corner to the opening's near edge, in meters. (added 2026-11-10) In the app they live inside the room (`room.openings`), so undo and redo cover them like the walls.
- The floor, the walls, the wall that fades when facing the camera, the Room render and the clamping of furniture (the rotated footprint must stay inside the room) all use the corners, not width and depth.
- Save and open: the file stores `corners` and `openings` and a version number (2; version 1 files still open). Files from before Part J (width, depth, height) import as a rectangle in the same place, so objects do not move. A file with corners that do not form a valid closed room is rejected with a clear message.

### Shape buttons (Room configuration, Plan and Build)
- Four icon buttons above the fields: **Square** (default), **Rectangle**, **L**, **Build**.
- Square: Side and Height. Rectangle: Width, Depth, Height. L: Width, Depth, Notch width, Notch depth, Height, plus a **rotate** button that moves the notch to the next corner. Each leg of the L stays at least 0.5 m.
- Switching between shapes keeps width and depth where they make sense.
- Build opens the Build tab.
- If the room was shaped in Build into something that is not a preset, no shape button is selected, Width and Depth show the bounding box (not editable) and a line says "Custom shape. Edit it in Build."
- Changing the shape in Plan pushes pieces that end up outside back in, with the same notice as leaving Build.

### Coordinates
- Object details shows Location X and Z measured from the origin corner (the middle of the object, as today). Typing a number converts back to the stored position.
- Every position inside the room is 0 or more.

### Build mode
- The top bar has three tabs: **Build | Plan | Personalize**. Plan stays the starting mode.
- The view is from above, flat, no shadows or lighting: floor color, dark walls, no 3D look. Furniture is hidden.
- The left panel has Room configuration (shape buttons, Height), the selected wall's details and an Openings section.
- Every wall shows its inside length as a label (meters). Clicking the label lets me type a number. When the length changes, the wall at the end farther from the origin moves.
- Mouse wheel zooms, dragging empty space pans.
- Leaving Build: pieces outside the room are moved inside, and a line says "N objects were moved inside the room." Edits in Build are undoable (one step per drag or typed value). Moving the pieces inside is its own undo step.
- (added 2026-11-10) New Project and Open Project work in Build, as in Plan.
- (added 2026-11-10) Clicking Personalize from Build passes through Plan: the Room renders need Plan's 3D view, so Plan shows for a moment, the renders are taken, then Personalize opens.

### Move a wall (J.5)
- Hovering a wall highlights it. Dragging moves it sideways only (a horizontal wall moves up or down, a vertical wall moves left or right). Its two end corners move with it and the neighboring walls stretch or shrink.
- Movement snaps to 5 cm.
- A move is stopped if a wall would get shorter than 0.5 m, the room would cross itself, or a door or window would no longer fit its wall. The wall stops at the limit; for the opening case a short message says what did not fit.

### Cut and drag (J.6)
- A selected wall shows a **Cut** button (scissors). Cutting at a point makes a 1 m piece centered there (a third of the wall if the wall is shorter than 3 m, never under 0.5 m). The wall must be at least 1.5 m long to cut.
- That piece is now its own wall and moves like in J.5, so dragging it in or out creates an alcove or a bump. Its two short side walls grow as it moves.
- When a moved piece lines up again with its neighbors, the extra corners are merged and it becomes one wall again.

### Doors and windows (J.7 in Build, J.8 in Plan)
- Build panel, Openings: **Door** and **Window** buttons. Adding one places it on the selected wall (or the longest wall if none is selected), centered.
- Defaults: door 0.90 m wide, 2.05 m high, on the floor. Window 1.20 m wide, 1.20 m high, sill 0.90 m.
- In Build it can be dragged along its wall, and dragged onto another wall to move there. Details: wall offset, width, height, and sill (windows only; a door's sill is always 0).
- Rules: it stays inside its wall with at least 0.1 m left at each end, it cannot overlap another opening, and sill + height cannot be more than the room height. A wall too short for it blocks adding one, with a message.
- Symbols in Build: a door is a gap in the wall with an arc, a window is two thin lines in the wall.
- In 3D (Plan, Personalize) it is a flat colored rectangle just in front of the wall.
- In Plan, openings are listed in the Objects section under their own **Openings** group. Selecting one opens Object details with the same fields. I can move it up, down, left, right (drag in the wall plane, number fields, arrow keys) and change width and height. It stays on its own wall. Doors cannot leave the floor.
- Deleting an opening: Delete key or button, as for furniture.

## Tasks
Order: fixes first, then the room data, then what I see. Each one follows the checkpoint workflow.

- ✅ J0.1 Panel minimum width.
- ✅ J0.2 Drag moves by default, rotate only from the widget.
- ✅ J0.3 Move readout while dragging.
  - ✅ J0.3.1 The readout shows the distance moved per direction, with arrows (added 2026-11-10)
- ✅ J0.4 Distances to the four walls for the selected object.
- ⬜ J0.5 Shortcuts: Ctrl+S, Ctrl+O, arrow nudge, R, and the focus guard.
- ⬜ J0.6 Duplicate and Ctrl+D.
- ⬜ J.1 Room as corners: store, floor, walls, camera-facing wall fade, Room render, clamping, save and open with old files.
- ⬜ J.2 Corner origin: Location numbers in Object details.
- ⬜ J.3 Shape buttons: Square, Rectangle, L with rotate. The Build button stays disabled until J.4.
- ⬜ J.4 Build tab: top view, wall labels with typed length, furniture hidden, pan and zoom, notice on leaving.
- ⬜ J.5 Move a wall.
- ⬜ J.6 Cut and drag.
- ⬜ J.7 Doors and windows in Build.
- ⬜ J.8 Doors and windows in Plan: list group, details, move and resize.
- ⬜ J.9 Undo and redo in Build, and the 1, 2, 3 mode shortcuts.
- ⬜ J.10 Personalize with openings: check the AI keeps doors and windows, adjust the prompt if not. Update docs and run the verifier.

## Acceptance criteria
- [ ] J0.1: with the divider dragged fully left, at 1280 px and at a wide window, every number in Room configuration and Object details is fully visible.
- [ ] J0.2: pressing on a sofa and moving the mouse moves it, also zoomed out; it turns only when I grab the rotate ring.
- [ ] J0.3: while dragging, the label shows the same X and Z as Object details shows after the drop. (replaced by J0.3.1)
- [ ] J0.3.1: a sofa dragged 30 cm straight shows one number, "30 cm", with an arrow the way it moved on screen; a diagonal drag shows two; 1 m and more shows in meters.
- [ ] J0.4: a selected sofa shows four lines with distances that add up to the room size minus its footprint, for a turned sofa too, and they update while dragging.
- [ ] J0.5: Ctrl+S saves in all modes; Ctrl+O opens in Plan and Build; arrows nudge 10 cm (Shift 1 cm) and one Ctrl+Z undoes a burst; R switches the widget; Backspace with the color field or a button focused does not delete.
- [ ] J0.6: Ctrl+D and the Duplicate button make "Sofa 2" next to "Sofa 1", selected, inside the walls; one Ctrl+Z removes it.
- [ ] J.1: an old file opens with everything in the same place; an L room keeps furniture out of the notch; the Room render of a rectangle room looks as before; a file with a broken room is refused with a message.
- [ ] J.2: an object in the front left corner shows Location near 0, 0; typing a Location puts it there.
- [ ] J.3: Square, Rectangle and L set the room; the L rotate button moves the notch; pieces pushed in show the notice.
- [ ] J.4: Build shows the room from above with wall lengths; a typed length moves the far end; Build → Personalize shows the Room renders; leaving Build moves pieces inside with the notice.
- [ ] J.5 to J.8: the spec's rules hold (5 cm snap, 0.5 m walls, no crossing, openings fit their wall and the room height); each step can be undone.
- [ ] J.9: Ctrl+Z works in Build; 1, 2, 3 switch modes.
- [ ] J.10: prompt runs with a door and a window are in `docs/prompts/restyle.md`, with the decision.
- [ ] No console errors; `npm run build`, `npm run lint` and `npm test` succeed; deployed and working on the live site.

## Backlog
- Draw walls freely instead of cut and drag (after testing with real users).
- Angled walls (Part K).

## Open questions
- None blocking. Answered 2026-11-10 (Julia): the Build tab is always in the top bar; arrow keys move relative to the screen, snapped to the nearest room axis; a typed wall length moves the end farther from the origin; the move readout shows the new position.

## Changelog
- 2026-11-10: Draft written (Julia).
- 2026-11-10: Spec approved, Part J started (In progress). Open questions answered. From the code survey: Ctrl+O in Plan and Build only; Build → Personalize passes through Plan; shown Z counts from the front wall (world +z); old files keep world coordinates; New Project is a 5 × 5 m square; openings live in `room` so undo covers them; file version 2.
