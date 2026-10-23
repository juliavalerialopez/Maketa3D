# Part D: Arrange in 3D

Status: **In progress**. Builds on Part C (selection, Object details, `roomBounds.js`).

## Goal
The room starts bigger. The user clicks a sofa in the 3D scene to select it, drags it around the floor, and uses a widget on the selected sofa to move it along one axis or turn it. In Object details, position and rotation are grouped in columns, rotation works on all three axes (objects can tilt), and every number can be changed by dragging on it.

## Requirements

### Bigger starting room
- Default room is 6 x 5 m, height 2.6 m (was 4 x 3 x 2.6). Limits from Part A stay (width and depth 2 to 10, height 2 to 4).
- New objects still land inside the room (placement logic unchanged).

### Select in 3D
- Clicking an object in the scene selects it (same `selectedId` as the list; list highlight, bounding box and Object details follow).
- Clicking empty floor or wall, or pressing Escape, deselects.
- Orbiting (drag on empty space) never changes the selection. An orbit drag that starts on an object does not select it either.
- Selecting from the Objects list keeps working as in Part C.

### Drag to move
- Press on an object and drag: it moves on the floor, X and Z only. Y stays 0.
- The object stays under the cursor at the point where it was grabbed (no jump to its centre).
- Pressing an object also selects it.
- Orbit is disabled while an object is being dragged, and works again on release.
- The object cannot leave the room: position is clamped with `positionLimits` (`src/store/roomBounds.js`). Against a wall it slides along the wall.
- Object details (X, Z) updates live while dragging.

### Widget (selected object)
- A widget (Drei `TransformControls`) appears on the selected object whenever an object is selected, whether from the list or in 3D.
- Move arrows and the rotate ring are shown **at the same time** (like the After Effects 3D gizmo); there is no mode switch. Built from two `TransformControls` on the same object.
- Move: axis arrows for X and Z. Dragging one arrow moves the object along that axis only. No Y arrow. A small XZ plane handle also shows (it cannot be hidden); it moves on the floor, so Y still stays 0.
- Rotate: one ring around the vertical (Y) axis, sized to sit outside the arrows. Snaps to 15° steps. Tilt (X, Z) is not changed by the widget and is kept.
- Rotation is written normalized to 0–360°, as in Object details.
- Orbit is disabled while the widget is in use.
- The widget respects the same room limits as dragging: during and after a move or rotation the object is clamped inside the walls.

### Object details layout
- **Location**: X and Z side by side in one row (no Y; objects stay on the floor). Same limits as Part C.
- **Rotation**: X, Y and Z side by side in one row, degrees, all three editable. Up/Down ±15°. Each axis normalized to 0–360° on blur.
- Each group has a title; each value has its axis label above it.
- Changing rotation from the panel also clamps the position, so the footprint stays inside the room (closes the Part C gap "rotating next to a wall can push the footprint outside").

### Tilt
- Rotation is stored as `[x, y, z]` in radians, Euler order `YXZ`: Y turns the object on the floor, X and Z tilt it.
- A tilted object rests on the floor: the renderer lifts it so its lowest point is at y = 0. The stored y stays 0.
- The room clamp uses the full rotated box, so a tilted object also stays inside the walls.
- The bounding box follows the tilt and the lift.

### Drag to change a value
- In every number field (room inputs and Object details), pressing in the value and dragging left or right changes it: one `step` per 4 px, right = up.
- Dragging starts after the pointer moves more than 3 px. A click without moving focuses the field for typing, as before.
- While dragging, the value stays within min/max. On release, the same limits as on blur apply (clamp, or normalize for rotation).
- The cursor shows a left-right arrow while dragging, and no text is selected.

### Panel stays in sync
- `NumberField` shows the new value when the store changes from outside (dragging, widget) while the field is not focused.
- Editing one object does not re-render every object in the scene (`Objects.jsx` subscribes per object) or the whole Objects list.

## Tasks
- ✅ D.1 Bigger starting room (6 x 5 x 2.6) in `roomStore.js`
- ✅ D.2 Per-object subscriptions in `Objects.jsx` (prep for dragging)
  - ✅ D.2.1 `ObjectList` subscribes to ids and labels only (`useShallow`) (added 2026-10-23: the list re-rendered on every change to any object)
  - ✅ D.2.2 `Objects.jsx` owns each object's transform group; models take only `size` and `color` (added 2026-10-23: clicks, drag and the widget need one group per object owned by the scene)
- ⬜ D.3 Select in 3D
  - ⬜ D.3.1 Click an object to select it
  - ⬜ D.3.2 Click empty space deselects (Escape already does)
  - ⬜ D.3.3 Orbit drags do not count as clicks
- ⬜ D.4 Drag to move on the floor
  - ⬜ D.4.1 Drag moves the object on the floor plane, keeping the grab offset
  - ⬜ D.4.2 Orbit disabled while dragging
  - ⬜ D.4.3 Clamp with `positionLimits`, sliding along walls
  - ⬜ D.4.4 `OrbitControls` is the default controls (`makeDefault`), so drag and widget can turn it off (added 2026-10-23)
- ✅ D.5 `NumberField` resyncs its text when `value` changes from outside while not focused
- ⬜ D.6 Widget
  - ⬜ D.6.1 `TransformControls` on the selected object, move mode, X and Z only
  - ⬜ D.6.2 Rotate mode
  - ⬜ ~~D.6.3 Switch between move and rotate~~ (dropped 2026-10-23: both shown together, see D.6.5)
  - ⬜ D.6.4 Clamp inside the room after move and rotate
  - ⬜ D.6.5 Move arrows and rotate ring shown together: two `TransformControls` on the same object (added 2026-10-23)
  - ⬜ D.6.6 Rotate ring snaps to 15° (added 2026-10-23)
  - ⬜ D.6.7 Widget rotation stored normalized to 0–360° (added 2026-10-23)
- ⬜ D.8 Changing rotation in Object details also clamps the position inside the room (added 2026-10-23: Part C gap)
- ⬜ D.9 Drag to change a value in `NumberField`, all number fields (added 2026-10-23)
- ⬜ D.10 Location group in Object details: X and Z side by side (`FieldGroup` in `src/components/ui/`) (added 2026-10-23)
- ⬜ D.11 Rotation as `[x, y, z]` (Euler `YXZ`) in the store and rendering; tilted objects lifted onto the floor (added 2026-10-23)
- ⬜ D.12 Room clamp for tilted objects: `positionLimits` uses the full rotated box (added 2026-10-23)
- ⬜ D.13 Rotation group in Object details: X, Y, Z side by side, all editable (added 2026-10-23)
- ⬜ D.7 Build passes and deploy (last task of the part)

## Out of scope
Moving objects up or down (Y). Wall-mounted items. Editing size. Multi-select, undo, snapping to other objects. Tilting with the widget (tilt is set in Object details).

## Acceptance criteria
- [ ] A fresh page shows a 6 x 5 m room.
- [ ] Clicking a sofa in 3D selects it: list highlight, bounding box and Object details appear.
- [ ] Clicking empty space or pressing Escape deselects it.
- [ ] Orbiting never changes the selection, also when the orbit drag starts on a sofa.
- [ ] Dragging a sofa moves it across the floor and it stays under the cursor; it never lifts off the floor.
- [ ] The camera does not orbit while a sofa is dragged.
- [ ] Dragging into a wall stops the sofa at the wall and it keeps sliding along it.
- [ ] X and Z in Object details change live while dragging.
- [ ] The widget shows on the selected sofa, also after selecting it from the list.
- [ ] The widget's arrows and ring are visible at the same time.
- [ ] The widget's arrows move the sofa along one axis only.
- [ ] The widget's ring turns the sofa in 15° steps; Rotation Y in Object details follows (0–360°).
- [ ] Rotating a sofa next to a wall, with the widget or in Object details, never leaves its footprint outside the room.
- [ ] Object details shows Location with X and Z side by side, and Rotation with X, Y and Z side by side.
- [ ] Dragging right in a value raises it, dragging left lowers it; a click without dragging lets you type.
- [ ] A sofa tilted 90° on X stands on the floor, its bounding box matches, and it stays inside the walls.
- [ ] With two sofas, dragging one never moves the other.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- **Y movement (move objects up and down).** Needed for wall items and shelves; decide floor and ceiling rules then. Decided 2026-10-23: not in Part D.
- A tall object tilted over can poke through the ceiling (no ceiling clamp).
- Tilting with the widget (X and Z rings).
- Edit object size (width, depth, height), with limits to decide.
- Undo delete, and undo for moves.
- New-object placement after a delete can land on an existing object.
- Keep objects inside the room when the room shrinks.
- Objects overlapping each other while dragging (collision or snapping).
- Shortcut guard also for the color input (Backspace deletes the object when it has focus).
- Color swatches next to the native picker.
- `SplitLayout`: pointer events with pointer capture, no text selection while dragging the divider.

## Open questions
- None blocking.

## Changelog
- 2026-10-23: Draft created. Scope: bigger start room, click-to-select in 3D, drag to move on the floor, widget for axis moves and rotation. Y movement moved to Backlog.
- 2026-10-23: Review. Open questions answered: move arrows and rotate ring shown together (no mode switch, D.6.3 dropped for D.6.5), ring snaps to 15°, widget shows whenever an object is selected. Prep tasks added (D.2.1, D.2.2, D.4.4). Work order set (D.5 before D.4). Part C rotation gap fixed in Part D (D.8).
- 2026-10-23: Object details redesign: Location group (X, Z side by side), Rotation group (X, Y, Z, all editable, objects can tilt), drag to change any number value. Rotation becomes `[x, y, z]` (SPEC.md data model updated). Tasks D.9–D.13 added.
- 2026-10-23: Work order (not number order): D.1, D.2 (+D.2.1, D.2.2), D.5, D.9, D.10, D.11, D.12, D.13, D.8, D.3, D.4 (D.4.4 first), D.6, D.7. D.5 before D.4 so X and Z update live while dragging; panel and rotation format before dragging and the widget, which build on them.
