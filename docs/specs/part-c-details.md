# Part C: Select, Edit Details, Delete

Status: **In progress**. Builds on Part B (objects store, Sofa, Objects list).

## Goal
The user selects an object from the Objects list, moves and rotates it and changes its color in the Object details section, and can delete it.

## Requirements

### Shared UI components
- `src/components/ui/` holds the reusable panel controls, so each is styled and changed in one place:
  - `NumberField`: label, number input, unit; Part A input behavior (see Object details). Props: `label`, `value`, `onChange`, `min`, `max`, `step`, `unit`.
  - `Button`: one action button style. Props: `onClick`, `children`.
  - `ListItem`: one clickable list row with a selected state. Props: `label`, `selected`, `onClick`.
- Every number input, action button and list row in the panel uses these: room inputs, "Add Sofa", Object details fields, "Delete", Objects list items.

### Store
- Add to `src/store/objectsStore.js`:
  - `selectedId: string | null` (default `null`), as in the SPEC.md data model.
  - `selectObject(id | null)`
  - `updateObject(id, partial)`: shallow-merges `partial` into the object.
  - `removeObject(id)`: removes the object; if it was selected, `selectedId` becomes `null`.
- Each object gets a stable `number` at creation, per type: 1, 2, 3, ... Numbers are never reused, so after deleting "Sofa 3" the next sofa is "Sofa 4".

### Labels
- The Objects list and Object details show `"<type label> <number>"`, e.g. "Sofa 3". Deleting another object never renames it.

### Selection (list only)
- Clicking an item in the Objects list selects it.
- The selected item is visibly highlighted in the list.
- Clicking the already selected item deselects it.
- Escape deselects, unless focus is in a text or number input.
- Clicking in the 3D scene does **not** select or deselect in this part (orbit stays as it is).

### Selected-object visual
- The selected object shows a wireframe bounding box that matches its `size`, with 2 cm padding so it doesn't z-fight with the object.
- One fixed highlight color, `#4da3ff`, not derived from the object's color.
- The box follows position and rotation changes live.

### Object details section
- Third collapsible section, "Object details", shown only when an object is selected; open by default when it appears.
- Header or first line names the object, e.g. "Sofa 2".
- Switching the selection to another object shows that object's values.
- All number fields share the Part A input behavior: decimals, Up/Down steps, typed numbers written immediately (unclamped), limits applied on blur, empty or invalid never written.
- **Position**: X (left–right) and Z (back–front) in m, 0 = room centre. Up/Down ±0.1.
  On blur, the value is clamped so the object's footprint (taking its rotation into account) stays inside the room walls.
  The object always stays on the floor (y = 0); there is no Y field.
- **Rotation**: degrees around the vertical axis, any value. Up/Down ±15°. Stored in radians, as in the data model.
  On blur, normalized to 0–359.9°.
- **Color**: native `<input type="color">`, writes to the store while dragging (live preview).

### Delete
- A "Delete" button in Object details removes the selected object. No confirmation.
- Delete or Backspace removes the selected object, unless focus is in a text or number input.
- After deleting, nothing is selected and Object details is hidden.

## Tasks
- ⬜ C.1 Shared UI components in `src/components/ui/`
  - ✅ C.1.1 `NumberField`: the A.4 input behavior, extracted from `RoomInputs.jsx`; room inputs use it
  - ✅ C.1.2 `Button`: one action button; "Add Sofa" uses it
  - ⬜ C.1.3 `ListItem`: one list row; the Objects list uses it (selection wired in C.4)
- ⬜ C.2 Selection store (`selectedId`, `selectObject`, `updateObject`, `removeObject`)
- ⬜ C.3 Stable object numbers (`number` per type, used for labels)
- ⬜ C.4 Select from the Objects list
  - ⬜ C.4.1 Click to select, click again to deselect, highlight selected item
  - ⬜ C.4.2 Escape deselects (ignored while typing in an input)
- ⬜ C.5 Bounding box on the selected object
- ⬜ C.6 Object details section
  - ⬜ C.6.1 Section shown only when something is selected, with the object's name
  - ⬜ C.6.2 Position inputs (X, Z), clamped to keep the footprint inside the room
  - ⬜ C.6.3 Rotation input (degrees, ±15°)
  - ⬜ C.6.4 Color input
- ⬜ C.7 Delete
  - ⬜ C.7.1 Delete button
  - ⬜ C.7.2 Delete/Backspace key (ignored while typing in an input)
- ⬜ C.8 Build passes and deploy

## Out of scope
Editing size. Selecting by clicking in 3D, dragging to move or rotate (Part D). Multi-select, undo.

## Acceptance criteria
- [ ] Clicking "Sofa 2" in the list highlights it in the list and shows a bounding box around that sofa only.
- [ ] Clicking "Sofa 2" again, or pressing Escape, deselects it and hides Object details.
- [ ] Object details is not visible when nothing is selected.
- [ ] Typing 1 in X moves the selected sofa 1 m to the right immediately; the bounding box follows.
- [ ] Pressing Up in X changes 0 to 0.1; pressing Up in Rotation changes 0 to 15.
- [ ] Typing 90 in Rotation turns the sofa a quarter turn; the bounding box turns with it.
- [ ] Typing 20 in X and leaving the field puts the sofa against the right wall, fully inside the room.
- [ ] Clearing a field does not crash or move the sofa.
- [ ] Selecting Sofa 1, then Sofa 2, shows Sofa 2's values in Object details.
- [ ] Picking a color changes the selected sofa's color live; other sofas keep theirs.
- [ ] "Delete" removes the selected sofa from the scene and the list; Object details disappears.
- [ ] After deleting "Sofa 2" of three, the others are still "Sofa 1" and "Sofa 3"; the next one added is "Sofa 4".
- [ ] Pressing Backspace while typing in a field edits the field and does not delete the sofa.
- [ ] Orbiting the scene still works and never changes the selection.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- Click an object in 3D to select it; click empty or Escape to deselect (prototype interaction model). Part D, together with dragging.
- Edit object size (width, depth, height), with limits to decide.
- Undo delete.
- New-object placement after a delete can land on an existing object (placement counts objects, not free spots).
- Keep objects inside the room when the room shrinks or an object is rotated (also in Part B backlog).
- Color swatches next to the native picker.

## Open questions
- None blocking.

## Changelog
- 2026-10-16: Draft created. Scope set to select + details + delete; move and rotate moved to Part D. Selection from list only; editable fields size and color; bounding-box highlight; delete via button and Delete/Backspace.
- 2026-10-16: Review. Size editing dropped (backlog). Position (X, Z) and rotation added as number inputs in Object details; dragging in 3D stays in Part D. Color kept. Stable object numbers (C.2). No delete confirmation. Overlap after delete goes to backlog. Shared number field extracted from the room inputs (C.5.1).
- 2026-10-16: Shared UI components (`NumberField`, `Button`, `ListItem` in `src/components/ui/`) moved to the front as C.1; tasks renumbered C.2–C.8 (still draft).
