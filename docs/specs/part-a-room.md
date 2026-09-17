# Part A: Layout and Room Configuration

## Goal
The user sets room width, depth, and height in a left panel, and the 3D room updates immediately.

## Requirements

### Layout
- Left panel 20% width, 3D scene 80%, both full height.
- Canvas resizes correctly with the window.

### Collapsible sections
- Panel shows section headers: "Room configuration" and "Objects".
- Clicking a header opens or closes its section.
- Both open by default. "Objects" is an empty placeholder in this part.

### Room configuration
- Three number inputs: width, depth, height, with an "m" unit label.
- Accept decimals (e.g. 3.25).
- Up/Down arrow keys change the value by 0.1.
- Limits: width and depth 2 to 10, height 2 to 4.
- Values outside limits are clamped when the input loses focus.
- Empty or invalid input never breaks the scene (scene keeps the last valid value).
- Defaults: width 4, depth 3, height 2.6.

### Store
- `room: { width, depth, height }` and `setRoomSize(partial)` in `src/store/`.
- Inputs write to the store; floor and walls read from it.

### 3D room
- Floor and 4 walls built from store values.
- Room centered at the origin, floor at y = 0.
- Walls between the camera and the room center are hidden or transparent, so the interior is always visible.
- Existing OrbitControls and lighting stay.

## Out of scope
Adding objects, selection, object details, dragging, saving.

## Acceptance criteria
- [ ] Panel takes 20% of the width; scene fills the rest, also after resizing the window.
- [ ] Clicking "Room configuration" header hides the inputs; clicking again shows them.
- [ ] Typing 5.5 in width makes the room 5.5 m wide immediately.
- [ ] Pressing Up in the width field changes 4 to 4.1 and the wall moves.
- [ ] Typing 20 in width and leaving the field sets it to 10.
- [ ] Clearing a field does not crash or collapse the room.
- [ ] Orbiting around the room, the interior is always visible.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Open questions
- None blocking. Decisions above use defaults; update this file if they change.
