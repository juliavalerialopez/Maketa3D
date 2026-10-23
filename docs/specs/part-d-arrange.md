# Part D: Arrange in 3D

Status: **Draft**. Builds on Part C (selection, Object details, `roomBounds.js`).

## Goal
The room starts bigger. The user clicks a sofa in the 3D scene to select it, drags it around the floor, and uses a widget on the selected sofa to move it along one axis or rotate it.

## Requirements

### Bigger starting room
- Default room is 6 x 5 m, height 2.6 m (was 4 x 3 x 2.6). Limits from Part A stay (width and depth 2 to 10, height 2 to 4).
- New objects still land inside the room (placement logic unchanged).

### Select in 3D
- Clicking an object in the scene selects it (same `selectedId` as the list; list highlight, bounding box and Object details follow).
- Clicking empty floor or wall, or pressing Escape, deselects.
- Orbiting (drag on empty space) never changes the selection.
- Selecting from the Objects list keeps working as in Part C.

### Drag to move
- Press on an object and drag: it moves on the floor, X and Z only. Y stays 0.
- The object stays under the cursor at the point where it was grabbed (no jump to its centre).
- Pressing an object also selects it.
- Orbit is disabled while an object is being dragged, and works again on release.
- The object cannot leave the room: position is clamped with `positionLimits` (`src/store/roomBounds.js`). Against a wall it slides along the wall.
- Object details (X, Z) updates live while dragging.

### Widget (selected object)
- A widget (Drei `TransformControls`) appears on the selected object only.
- Move mode: axis arrows for X and Z. Dragging one arrow moves the object along that axis only. No Y arrow.
- Rotate mode: a ring around the vertical axis. Stored in radians, as in the data model.
- Orbit is disabled while the widget is in use.
- The widget respects the same room limits as dragging: after a move or rotation the object is clamped inside the walls (this also closes the Part C gap "rotating next to a wall can push the footprint outside").
- Which mode is active and how the user switches it: see Open questions.

### Panel stays in sync
- `NumberField` shows the new value when the store changes from outside (dragging, widget) while the field is not focused.
- Editing one object does not re-render every object in the scene (`Objects.jsx` subscribes per object).

## Tasks
- [ ] D.1 Bigger starting room (6 x 5 x 2.6) in `roomStore.js`
- [ ] D.2 Per-object subscriptions in `Objects.jsx` (prep for dragging)
- [ ] D.3 Select in 3D
  - [ ] D.3.1 Click an object to select it
  - [ ] D.3.2 Click empty space deselects (Escape already does)
  - [ ] D.3.3 Orbit drags do not count as clicks
- [ ] D.4 Drag to move on the floor
  - [ ] D.4.1 Drag moves the object on the floor plane, keeping the grab offset
  - [ ] D.4.2 Orbit disabled while dragging
  - [ ] D.4.3 Clamp with `positionLimits`, sliding along walls
- [ ] D.5 `NumberField` resyncs its text when `value` changes from outside while not focused
- [ ] D.6 Widget
  - [ ] D.6.1 `TransformControls` on the selected object, move mode, X and Z only
  - [ ] D.6.2 Rotate mode
  - [ ] D.6.3 Switch between move and rotate
  - [ ] D.6.4 Clamp inside the room after move and rotate
- [ ] D.7 Build passes and deploy (last task of the part)

## Out of scope
Moving objects up or down (Y). Wall-mounted items. Editing size. Multi-select, undo, snapping to other objects.

## Acceptance criteria
- [ ] A fresh page shows a 6 x 5 m room.
- [ ] Clicking a sofa in 3D selects it: list highlight, bounding box and Object details appear.
- [ ] Clicking empty space or pressing Escape deselects it.
- [ ] Orbiting never changes the selection.
- [ ] Dragging a sofa moves it across the floor and it stays under the cursor; it never lifts off the floor.
- [ ] The camera does not orbit while a sofa is dragged.
- [ ] Dragging into a wall stops the sofa at the wall and it keeps sliding along it.
- [ ] X and Z in Object details change live while dragging.
- [ ] The widget's arrows move the sofa along one axis only.
- [ ] The widget's ring rotates the sofa; Rotation in Object details follows.
- [ ] Rotating a sofa next to a wall never leaves its footprint outside the room.
- [ ] With two sofas, dragging one never moves the other.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- **Y movement (move objects up and down).** Needed for wall items and shelves; decide floor and ceiling rules then. Decided 2026-10-23: not in Part D.
- Edit object size (width, depth, height), with limits to decide.
- Undo delete, and undo for moves.
- New-object placement after a delete can land on an existing object.
- Keep objects inside the room when the room shrinks.
- Objects overlapping each other while dragging (collision or snapping).
- Shortcut guard also for the color input (Backspace deletes the object when it has focus).
- Color swatches next to the native picker.
- `SplitLayout`: pointer events with pointer capture, no text selection while dragging the divider.

## Open questions
- Widget modes: one mode at a time (`TransformControls` limitation) with keys (W move, E rotate) or panel buttons, or both?
- Rotation snapping: free, or 15 degree steps like the Up/Down keys in Object details?
- Should the widget show right after selecting from the list, or only after selecting in 3D?

## Changelog
- 2026-10-23: Draft created. Scope: bigger start room, click-to-select in 3D, drag to move on the floor, widget for axis moves and rotation. Y movement moved to Backlog.
