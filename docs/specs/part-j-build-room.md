# Part J: Build the room, openings, shortcuts

Status: **In progress**. Builds on Part A (room), Part D (arrange), Part G (save and open) and Part I (history). Angled walls are Part K.

## Goal
1. I can start from a square, a rectangle or an L-shaped room, and I can reshape it in a new top view called **Build**.
2. I can add doors and windows to the walls, and fine-tune them in Plan.
3. Positions are measured from a corner of the room, like a real floor plan, and every object shows its distance to the walls.
4. A set of small fixes and keyboard shortcuts makes arranging faster (J0).
5. (added 2026-11-12) In Plan I can look at the room in three ways: **2D** (from above), **3D** (as today) and **Walk** (walking around inside it at eye height).

## Decisions
- Part J has two bundles. **J0** is small fixes and shortcuts that do not depend on room shape. **J** is the room itself. J0 goes first.
- The room is stored as a **closed list of corners**. Square, rectangle and L are presets of that list. In Part J every wall is horizontal or vertical. Angles come in Part K.
- Measurements are **inside** measurements, as taken with a tape from the inside. Walls are drawn with a fixed thickness outward from the inside edge. Editing thickness is out of scope.
- The **origin** is the bottom left corner of the room's bounding box (seen from above, front at the bottom). X grows to the right, Z grows toward the back. Stored positions do not change when walls move: only the numbers shown are recalculated, so furniture keeps its place in the room.
- (added 2026-11-10, code survey) Stored positions stay in world coordinates, where the front wall is at +z. So shown X = `x − minX` and shown Z = `frontZ − z` (the front wall's z minus the z of the point shown; for Location that is the front left corner of the piece's footprint, see Coordinates). Old files keep their place: a 6 × 5 room imports as corners at ±3, ±2.5, and camera slots need no change. Only the shown numbers start at 0.
- (added 2026-11-10) New Project's room is a Square of 5 × 5 m, height 2.6 m (today 6 × 5).
- Part 3 is **cut and drag** (no draw-a-wall). After testing with real users I decide if drawing is better.
- **Furniture is hidden in Build.** On leaving Build, any piece outside the room is pushed to the nearest valid spot with a short notice.
- Doors and windows are **flat rectangles** on the wall, no hole in the geometry.
- The distance readout appears when an object is **selected** (no Space key).

## Out of scope
- Angled walls (Part K), drawing walls, curved walls, columns, sloped ceilings, balcony, several rooms, several floors.
- Wall thickness editing, (an area label: now J.5.3) resize handles on openings, real holes or door swings in 3D, imperial units.

## Requirements

### J0: Fixes
- **Panel minimum width.** The left panel has a minimum width at which every number in Room configuration and Object details is fully visible (about the width in my second screenshot; Claude Code measures the smallest width that works). The divider cannot go below it. (changed 2026-11-10) The minimum is **276 px**, measured by Julia.
- **Drag moves by default.** Pressing an object and moving the mouse moves it on the floor. It rotates only when I grab the rotate widget.
- **Move readout.** While I drag an object, a small label next to it shows its new position, X and Z in meters, the same numbers as Location in Object details (from the origin corner once J.3 is in). (changed 2026-11-10: the new position, not the distance moved; replaced by J0.3.1 below, the distance moved.)
  - (added 2026-11-10) J0.3.1: after trying it, Julia wants the distance moved instead: one number per direction the object moved along the room's axes, each with an arrow showing which way it went on screen (→ ↗ ↑ ↖ ← ↙ ↓ ↘), e.g. "→ 30 cm" for a straight move and "→ 30 cm  ↑ 1.2 m" for a diagonal one. Under 1 m in centimeters, from 1 m in meters.
- **Distance to walls.** While an object is selected in Plan, a thin line with a number (meters) goes from each of its four sides to the nearest wall in that direction. For a rotated object the four sides are the extremes of its footprint along the room axes. The numbers update while dragging.
- **Duplicate.** Ctrl+D (and a Duplicate button in Object details) makes a copy 0.3 m to the side, with its own number, and selects it. Clamped inside the walls.

### J0: Shortcuts
Plan mode only unless stated. Cmd replaces Ctrl on Mac. Shortcuts are ignored while typing in a field, except Ctrl+S and Ctrl+O. Ctrl+S, Ctrl+O and Ctrl+D block the browser's own action. Delete, Backspace, Escape, the arrow keys and Ctrl+D act only when the focus is on the page or the 3D view, never on a field or a button. (changed 2026-11-10) No R shortcut: Julia dropped it; the move arrows and the rotate ring stay shown together.
- (added 2026-11-10) Found while testing J0.5: with a Room field still focused, Ctrl+Z ran the browser's text undo in that field, so the room shrank and the moved object stayed. Now Ctrl+Z and Ctrl+Y in a number field finish the field first (limited, like a blur) and then run the app's undo, and a press in the 3D view takes the focus off a panel field or button.

| Shortcut | Action | Status |
|---|---|---|
| Ctrl+Z | Undo | exists (also in Build, J.10) |
| Ctrl+Shift+Z, Ctrl+Y | Redo | exists (also in Build, J.10) |
| Delete, Backspace | Delete the selected object | exists |
| Escape | Deselect | exists |
| Arrow Up / Down in a number field | Step the value | exists |
| Ctrl+S | Save the project (all modes) | new |
| Ctrl+O | Open a project (Plan and Build; like the menu, not in Personalize) | new |
| Arrow keys on a selected object | Nudge 10 cm; with Shift 1 cm | new |
| Ctrl+D | Duplicate the selected object | new |
| 1, 2, 3 | Build, Plan, Personalize | new (J.10) |
| W, A, S, D, arrow keys in Walk | Walk forward, left, back, right | new (J.1.2) |

- (as built 2026-11-16, J.10) Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y work in Build the same way as in Plan, also from a field being typed in, with the wall, cut and opening changes one step each; Build shows the Undo and Redo buttons at the top left of its view, as Plan does. 1, 2 and 3 go to Build, Plan and Personalize like the mode switch does (leaving Personalize still asks first when there are versions); they are ignored while typing in a field and while a menu or dialog is open, and work with the focus on a button.
- Arrow keys move relative to the screen: Left and Right move to the left and right on screen, Up moves away from the camera, Down toward it, each snapped to the nearest room axis. A move is clamped inside the walls like a drag. One held key or burst of presses is one undo step.
- Known gap fixed here: with focus on the color input or a button, Backspace and Delete must not delete the object.

### Views in Plan (J.1, added 2026-11-12)
- A **2D · 3D · Walk** switch at the top center of Plan's 3D view (Undo and Redo stay top left, the frame toggle top right). 3D is the default. Plan only: Personalize shows still images and has no live view.
- The chosen view and each view's camera survive a mode switch (kept in the store), and are not saved in the project file.
- **2D:** the room seen straight from above, front wall at the bottom, no perspective. (added 2026-11-16, J.1.3, Julia) No shadows and no shading: every surface shows in its plain color, like Build but with the furniture; the walls and the door and window rectangles stay as they are. A Room render taken while 2D is open is still lit and shaded as in 3D. (added 2026-11-16, J.1.4, Julia) Each piece of furniture shows its name, as in the Objects list ("Sofa 1"), over the middle of it, as plain text (no card) in a variant of the piece's own color (same hue, much darker on a light piece and lighter on a dark one); 2D only, never in 3D, Walk or a Room render. A hidden piece's name is faded like the piece. (added 2026-11-16, J.9.5, Julia) Every door and window shows in 2D, not only when selected, as the same symbol Build draws, on top of its wall (a little wider than the wall, so the lines read): a gap in the wall; a window with two thin dark lines in it; a door with its open leaf and the arc it swings along, faint so it does not fight the furniture. Each has its name next to it inside the room ("Door 1", "Window 1"). 2D only, not in a Room render, and it takes no presses. Wheel zooms, dragging empty space pans, no tilt or turn. Furniture can be selected, dragged, turned, nudged, duplicated and deleted as in 3D, with the move readout and wall distances. Walls cannot be moved here (that is Build, J.5).
- **Walk:** I stand inside the room with my eyes at 1.6 m. It starts where the 3D camera is (moved inside the walls if it is outside), looking the same way but level, with a wider view than 3D (70°, added 2026-11-12). The mouse is never locked (changed 2026-11-12): dragging the view turns my head (the room follows the pointer; up and down stop at 85°). W A S D or the arrow keys walk (about 1.4 m/s; with Shift twice as fast), relative to where I look, always level. A line at the bottom says "Drag to look around. W A S D or the arrow keys walk, Shift goes faster." Walls stop me, 0.25 m before them; furniture does not. Looking only: nothing can be selected or moved, the selection, move arrows and wall distances are hidden. All four walls show (none fades). Needs a keyboard to walk.
- The frame guide and the camera slots show in 3D only. The Room renders always come from the 3D camera and the slots, as today, whatever view is open when I switch to Personalize.

### Room data
- `room: { height, corners: [{ x, z }, ...] }`, corners in order around the room, every edge horizontal or vertical. Walls are the edges between corners.
- (added 2026-11-12, J.4) In the app the room also keeps its `shape` ('square', 'rectangle', 'l' or 'custom'), the shape button that made it. The file does not store it: on Open it follows from the corners (a rectangle with equal sides is a Square).
- `openings: [{ id, type: 'door' | 'window', wallIndex, offset, width, height, sill }]`. `offset` is the distance from the wall's first corner to the opening's near edge, in meters. (added 2026-11-10) In the app they live inside the room (`room.openings`), so undo and redo cover them like the walls.
- The floor, the walls, the wall that fades when facing the camera, the Room render and the clamping of furniture (the rotated footprint must stay inside the room) all use the corners, not width and depth.
- Save and open: the file stores `corners` and `openings` and a version number (2; version 1 files still open). Files from before Part J (width, depth, height) import as a rectangle in the same place, so objects do not move. A file with corners that do not form a valid closed room is rejected with a clear message.

### Shape buttons (Room configuration, Plan and Build)
- Four icon buttons above the fields: **Square** (default), **Rectangle**, **L**, **Build**.
- Square: Side and Height. Rectangle: Width, Depth, Height. L: Width, Depth, Notch width, Notch depth, Height, plus a **rotate** button that moves the notch to the next corner. Each leg of the L stays at least 0.5 m.
- Switching between shapes keeps width and depth where they make sense. (added 2026-11-12, J.4.1) A Rectangle made from a room with equal sides keeps the width and is 3/4 as deep (at least 2 m), e.g. the 5 m Square becomes 5 × 3.75 m.
- Build opens the Build tab.
- If the room was shaped in Build into something that is not a preset, no shape button is selected, Width and Depth show the bounding box (not editable) and a line says "Custom shape. Edit it in Build."
- Changing the shape in Plan pushes pieces that end up outside back in, with the same notice as leaving Build.
- (added 2026-11-12, J.4.2) While the pointer is over a field, the walls it moves are clay in the view, with a clay line along their foot on the floor (so a wall the 3D view hides still shows; the line is never in the Room render). Width: every wall along the depth (left and right, an L's notch wall too; the room stays centred). Depth: every wall along the width. Side (Square): all walls. Notch width and Notch depth: the notch's inner wall that moves. Height (changed 2026-11-13, Julia): only the top edge of every wall is clay, no floor line; in Build, seen from above, that is the whole wall.

### Coordinates
- Object details shows Location X and Z measured from the origin corner. (changed 2026-11-12, Julia) Location is the **front left corner of the piece's footprint** (seen from above, also when it is turned), not its middle, so a piece pushed into the origin corner shows 0, 0. Typing a number converts back to the stored position (still the middle of the piece).
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
- (added 2026-11-12, J.5) Each wall's length is a small number field named "Wall 1", "Wall 2", ... just outside it: click to type, or drag or use the arrow keys like any number field. A length that would break the room (a wall under 0.5 m, walls crossing, the room under 2 m or over 10 m across) is refused and the field shows the length again. Build and Plan's 2D view share one view (pan and zoom). The Build button in Room configuration opens Build; in Build the panel shows the shape buttons and Height only (plus the selected wall from J.7, and Openings from J.8). (changed 2026-11-16, J.5.4, Julia) Build's Room configuration shows all the room's sizes, like Plan's: Side, Width and Depth, an L's notch sizes and Height, with the same limits and wall highlight; a custom room shows its Width and Depth (not editable). Pieces still move inside only when Build closes.
- (changed 2026-11-13, J.5.1, Julia) The length next to each wall is plain text ("3.50 m"), with no field, card or wall number, and a click on it goes to the view. A length is typed in the panel's Wall section, once the wall is selected; the rules above stay.

- (added 2026-11-16, J.5.2, Julia) **Grid floor.** Build's floor has a **dotted line** at every whole meter each way, counted from the origin corner (J.3), a dot every 0.1 m along it (changed 2026-11-16, Julia: "line of dots"; it was a single dot at each crossing), and a solid line every 10 m as Julia asked, in place of the dotted line at that meter (no dots on a solid line); as built the line is every 5 m, because a room is at most 10 m across and a 10 m line would only ever lie on a wall (one constant, `GRID_LINE_EVERY` in `gridPoints.js`; Julia to confirm). Dots and lines are inside the room only, never on or near a wall (an L's cut away corner has none), flat and light on the floor, the same in both themes, and take no presses. It does not change the 5 cm snap. Build only; never in a Room render.
- (added 2026-11-16, J.5.3, Julia) **Room sizes.** Like a floor plan: behind the room, a chain of dimension lines from corner to corner with the lengths between them, and over it one line for the whole width; the same down the left side for the depth. A plain rectangle has only the whole-width and whole-depth lines; an L has its pieces too. Each line has a tick at each end and its length as plain text ("4.20"). The room's **area** ("25.0 m²") is written in the middle of the floor (for an L, where its middle falls in the cut away corner, at the middle of the box around it). A corner in the middle of a straight wall (where it was cut) is no stop. In Plan's 2D view that is the chain along the back and left. In Build (changed 2026-11-16, Julia: she liked the line, and the same length showed three times) each wall instead has its own dimension line just outside it, from end to end with a tick at each end and its length ("3.50 m") in the middle, replacing the plain number of J.5.1; a cut piece has one each, and there is no chain or whole-size line there, only the area in the middle. Never in 3D, Walk or a Room render. Build and 2D fit the lines in view (`TOP_DIMENSION_MARGIN`, 1.6 m beyond the back and left edges). This replaces "an area label" in Out of scope. Julia's "each room" is read as the one room the app has; several rooms stay out of scope.

- (added 2026-11-16, J.5.5, Julia) **Scale legend.** In Build, the bottom left corner of the view shows a square made of the same dots as the grid, "1 m²" inside it, one meter on each side at the view's zoom (it follows pan and zoom, and is hidden when one meter is under 16 or over 140 pixels). It takes no presses and is not in a Room render.

### Move a wall (J.6)
- Hovering a wall highlights it. Dragging moves it sideways only (a horizontal wall moves up or down, a vertical wall moves left or right). Its two end corners move with it and the neighboring walls stretch or shrink.
- Movement snaps to 5 cm.
- A move is stopped if a wall would get shorter than 0.5 m, the room would cross itself, or a door or window would no longer fit its wall. The wall stops at the limit; for the opening case a short message says what did not fit.
- (added 2026-11-12, J.6) The room's 2 m and 10 m limits (seen from above) stop a move too. The wall under the pointer is drawn in a warm clay color and the pointer shows which way it moves.

### Cut and drag (J.7)
- A selected wall shows a **Cut** button (scissors). Cutting at a point makes a 1 m piece centered there (a third of the wall if the wall is shorter than 3 m, never under 0.5 m). The wall must be at least 1.5 m long to cut.
- That piece is now its own wall and moves like in J.6, so dragging it in or out creates an alcove or a bump. Its two short side walls grow as it moves.
- When a moved piece lines up again with its neighbors, the extra corners are merged and it becomes one wall again.
- (added 2026-11-12, J.7) A click on a wall selects it (clay color); its length and the Cut button show in the panel, and a click on the floor or Esc deselects. With Cut on, hovering the selected wall shows where the piece would go, and a click cuts it there; the new piece is selected. A piece stays in line until dragged 0.25 m out or in, then jumps to 0.5 m (its side walls are never under 0.5 m); dragged back within 0.25 m of the line, it lines up and merges. The same goes for any wall: dragged flush with another, the wall between them disappears (e.g. an L's notch dragged to the front wall gives a rectangle).
- (changed 2026-11-13, J.7.1, Julia) Cut no longer makes a 1 m piece, and it is no longer in the selected wall's section: the **Cut** button sits with Door and Window in the section renamed from Openings to **Wall tools**, and works on any wall. With Cut on, a point follows the pointer along the wall under it in 5 cm steps, at least 0.5 m from each end, with its distance to each end shown as text inside the room, next to each piece. A click splits the wall in two walls in line at that point; each can then be dragged on its own (for an alcove: cut twice, drag the middle piece). A wall shorter than 1 m cannot be cut (the pointer shows it, and a press does nothing); a point inside a door or window is refused with the message. After the cut, Cut is off and nothing is selected; Esc cancels; a cut refused for a door or window leaves Cut on. A typed length of a piece whose far end (J.5) is the cut point slides the point along the wall, so the other piece gets shorter or longer (never under 0.5 m). (fixed 2026-11-13, found by Julia) Two walls that do not meet at a corner stay at least 0.5 m apart, so walls never overlap in the view and a dragged wall stops 0.5 m before another one instead of passing it; a wall never folds back over the wall it joins in line. A file whose walls break this is refused like any broken room.
- (added 2026-11-13, J.8.3, Julia) A click on a wall selects it and shows a small bar next to it in the view with **Cut**, **Door** and **Window**; each starts the same tool as its panel button. The bar hides while the wall is dragged, when the selection is cleared, and while a tool is on. (added 2026-11-15) It sits inside the room, 0.6 m from the wall's middle; Cut is greyed out on a wall shorter than 1 m; presses on the bar never reach the view under it, and the wheel still zooms.

### Doors and windows (J.8 in Build, J.9 in Plan)
- Build panel, Openings: **Door** and **Window** buttons. Adding one places it on the selected wall (or the longest wall if none is selected), centered. (replaced 2026-11-13 by the placing tools, J.8.1 and J.8.2, below)
- Defaults: door 0.90 m wide, 2.05 m high, on the floor. Window 1.20 m wide, 1.20 m high, sill 0.90 m.
- In Build it can be dragged along its wall, and dragged onto another wall to move there. Details: wall offset, width, height, and sill (windows only; a door's sill is always 0).
- Rules: it stays inside its wall with at least 0.1 m left at each end, it cannot overlap another opening, and sill + height cannot be more than the room height. A wall too short for it blocks adding one, with a message.
- Symbols in Build: a door is a gap in the wall with an arc, a window is two thin lines in the wall.
- In 3D (Plan, Personalize) it is a flat colored rectangle just in front of the wall.
- In Plan, openings are listed in the Objects section under their own **Openings** group. Selecting one opens Object details with the same fields. I can move it up, down, left, right (drag in the wall plane, number fields, arrow keys) and change width and height. It stays on its own wall. Doors cannot leave the floor.
- Deleting an opening: Delete key or button, as for furniture.
- (added 2026-11-12, J.8) In Build, the Openings section lists them ("Door 1", "Window 1", numbered per type); a click there or on one in the view selects it (a wall and an opening are never selected together). Its details say which wall it is on and give From wall start, Width, Height and Sill (windows), in 5 cm steps; a value that does not fit is refused and the field shows the old one. Dragging moves it along its wall in 5 cm steps, and onto another wall when the pointer comes within 0.6 m of it. Doors and windows stay where they are when walls are cut or renumbered, and move with their own wall when it moves; a wall move or typed length that would leave one not fitting stops, and a cut through one is refused, each with a short message at the bottom of the view. After a new shape, size or height in Room configuration each goes to the wall facing the same way that is nearest to where it was, slides along it or gets lower to fit, or is left out if it cannot fit (a number half typed never changes them for good); Height cannot go below the tallest one. The project file saves them with the room, as `{ type, wall, offset, width, height, sill }` (`wall` is the wall's number, no id). The 3D rectangles (Plan, Room render) come with J.8 too: a door is wood brown, a window pale blue, and each hides with its wall.
- (changed 2026-11-13, J.8.1 and J.8.2, Julia) The Door and Window buttons (panel, and the wall bar from J.8.3) no longer add one in the middle of a wall; they change the pointer into a placing tool, on any wall, and Esc cancels:
  - **Door:** a 0.90 m door preview follows the pointer on the nearest wall (within 1 m of the pointer) in 5 cm steps, centred on it, with the distance from each side of the door to its wall's ends shown as text inside the room. Near a wall end it stops 0.1 m before it. One click places it, selected, and the tool turns off; dragging still pans the view. Where it does not fit (a wall too short, another opening) the preview is red, the pointer shows it cannot go there and a click does nothing. While the tool is on, walls and openings cannot be picked.
  - **J.8.1.1** (added 2026-11-15, changed 2026-11-16, Julia) The Door tool stays one click at 0.90 m. A door's or window's details (Build and Plan) get a **Default size** button next to Delete: it puts its Width and Height back to the standard size of its type (door 0.90 × 2.05 m, window 1.20 × 1.20 m; lower in a room too low for it), growing like a wider Width (J.9.1.1). It is greyed out when it already has that size, or when that size does not fit where it is. One undo step.
  - **Window:** a point follows the pointer on the nearest wall (within 1 m of the pointer) in 5 cm steps with its distance to the wall's ends; a click sets where the window starts. Then the preview stretches from there to the pointer along the same wall (the pointer can go either way), with its width (highlighted) and the distances shown; a second click sets where it ends and places it (1.20 m high, sill 0.90 m), selected, and the tool turns off. At least 0.3 m wide; it cannot cover another opening, and it stops 0.1 m before the wall's ends. Where it cannot go (a start inside another opening, too narrow, covering one) the point or preview is red, the pointer shows it, and a click does nothing. (added 2026-11-15) Nothing adds a door or window in the middle of a wall any more.
- (added 2026-11-16, J.8.6, Julia) A door can also be **flipped**: a **Flip** button beside the Opens switch moves its hinge to the other end of the door, so the leaf swings the other way along the wall (one undo step). Build and 2D draw it. The file keeps it as `hinge` ("start" or "end") on a door; a file without one hinges at the start, as before, and any other value refuses the file.
- (as built 2026-11-16, J.9.4) In Plan, the **Openings** group of the Objects section has **Door** and **Window** buttons above its list (greyed out in Walk). They start the same tools as in Build, in the 2D view (the floor near a wall, drawn as the 2D symbol) and in the 3D view (a click on a wall's inside face, the preview a colored rectangle on the wall, red where it cannot go; the walls hide with the camera as usual). Door: a click places it. Window: a click sets its start, a second its end, along the same wall. The placed one is selected and the tool ends. Esc, a second press of the button, selecting furniture, going to Walk or another mode also end it. With a tool on, a press on furniture or on a door or window places instead of selecting or dragging, and a click on empty space does not end the tool. The previews and distances are never in a Room render. Switching between 2D and 3D starts a window over.
- (added 2026-11-16, J.8.4, Julia) In Build, the selected door or window shows its distances as in Plan's 2D view (J.9.2): a line from each of its edges to the nearest wall along it, with the distance in meters, and the floor and ceiling distances as one label ("Floor 0.90 · Ceiling 0.65"). It follows the opening while it moves and is not in a Room render.
- (added 2026-11-16, J.8.5, Julia) A door opens **inside** (into the room, the default) or **outside**. Its details (Build and Plan) get an **Opens** switch, Inside | Outside, one undo step per change. Build and 2D draw the open leaf and the arc on that side. A window has no switch. The project file keeps it as `swing` ("in" or "out") on a door; a file without one (from before) opens it inside, and any other value refuses the file. The 3D rectangle does not change.
- (added 2026-11-15, J.9, Julia) Doors and windows in Plan, in four steps:
  - **J.9.1** Plan's Objects section lists them in an **Openings** group under the furniture ("Door 1", "Window 1", as in Build). A click there selects one: a piece of furniture and an opening are never selected together. Object details then shows the same fields as in Build (which wall, From wall start, Width, Height, Sill for windows) and Delete; the Delete key removes it and Esc lets it go, like furniture. The selected one has a thin outline in the 2D and 3D views, in the selection color, hidden in the Room render. A click on empty space lets it go.
  - **J.9.1.1** (added 2026-11-15, found by Julia) A door or window's fields (Build and Plan) change it while typing, stepping or dragging the field, so the view follows at once; a value that does not fit waits in the field, and if it still does not fit once final, the opening goes back to how it was before the edit. One undo step per edit. (added 2026-11-15, found by Julia) A wider Width keeps it where it is and grows it past its far edge; where its wall's end or another opening is in the way, it grows back toward the wall's start instead, so one against a wall's end can still get wider. Width goes up to the free stretch of wall it is on.
  - **J.9.2** A press on a door or window in Plan's 2D or 3D view selects it; dragging moves it on its own wall in 5 cm steps: along the wall, and in 3D also up and down for a window (a door stays on the floor). It keeps to the rules above. The whole drag is one undo step. (added 2026-11-15, Julia) While it is selected, as for furniture (J0.4), thin lines on the wall show the distance from each of its edges to the nearest wall along it (on each side), to the floor and to the ceiling, with the numbers, in 2D and 3D, following it while it moves. (added 2026-11-16, as built, Julia to confirm) The lines to the walls look past a cut point to the next wall that is not in line. In 2D, seen from above, the floor and ceiling distances are one label inside the room ("Floor 0.90 m · Ceiling 0.50 m"), since their lines would point at the camera.
  - **J.9.3** The arrow keys move the selected one 5 cm per press, along its wall (and up and down for a window in 3D), following the screen like furniture; a burst of presses is one undo step. (added 2026-11-16, as built, Julia to confirm) Left and Right move it along its wall the way the wall runs on screen. Up and Down move a window up and down in 3D; a door in 3D, and both in 2D, go along the wall when it runs away from the camera (up the screen in 2D). A key across the wall does nothing. Shift changes nothing: the step is always 5 cm.
  - **J.9.4** **Door** and **Window** buttons in Plan's Objects section start the same placing tools as in Build, in the 2D view (near a wall on the floor) and in 3D (pointing at a wall's inside face). Esc cancels.

### Doors and windows in the AI image (J.11)
- A door and a window in the Room render (flat rectangles: brown, pale blue) must be a real door and window in the AI image, on the same wall, at the same place and size, and none added (test T13 in `docs/prompts/restyle.md`).
- (added 2026-11-16, J.11.1, from Julia's check: the window was kept but not at its size) The request also sends the doors and windows that show in the Room render, each with its list name and the rectangle it covers there (percent from the left and from the top; one on a hidden wall, behind the camera or outside the frame is left out). The prompt (v10) lists them with those rectangles and allows only them. A request without any gets the v9 prompt.
- (added 2026-11-16, J.11.2, Julia) Personalize has no reference card for a door or a window, so their kind cannot be chosen. To do: a card per door and window in the Room render, Reference (photo) or Creative, like the furniture.

## Tasks
Order: fixes first, then the room data, then what I see. Each one follows the checkpoint workflow.

- ✅ J0.1 Panel minimum width.
- ✅ J0.2 Drag moves by default, rotate only from the widget.
- ✅ J0.3 Move readout while dragging.
  - ✅ J0.3.1 The readout shows the distance moved per direction, with arrows (added 2026-11-10)
- ✅ J0.4 Distances to the four walls for the selected object.
- ✅ J0.5 Shortcuts: Ctrl+S, Ctrl+O, arrow nudge, and the focus guard (R dropped 2026-11-10).
- ✅ J0.6 Duplicate and Ctrl+D.
- ✅ J.1 Views in Plan: 2D, 3D and Walk (added 2026-11-12)
  - ✅ J.1.1 The 2D · 3D · Walk switch and the 2D top view, with furniture editing; Walk shown but disabled until J.1.2 (added 2026-11-12)
  - ✅ J.1.2 Walk: drag to look, W A S D and arrow keys, eye height 1.6 m, stopped by the walls (added 2026-11-12)
  - ✅ J.1.3 Bug: furniture casts shadows in 3D but none in 2D (added 2026-11-12, found by Julia). (changed 2026-11-16, Julia) Not a bug any more: 2D has no shadows and no shading, flat like Build but with the furniture
  - ✅ J.1.4 In 2D, each piece of furniture shows its name ("Sofa 1") over it (added 2026-11-16, Julia)
  - ✅ J.9.5 In 2D, every door and window shows as a floor-plan symbol on its wall, with its name, not only when selected (added 2026-11-16, Julia; changed the same day: the symbol and the name, from Julia's floor plan reference)
  - ✅ J.8.5 A door opens inside or outside: a switch in its details, drawn in Build and in 2D (added 2026-11-16, Julia)
  - ✅ J.8.6 A door can be flipped to the other hinge side: a Flip button next to its Opens switch, drawn in Build and in 2D (added 2026-11-16, Julia)
  - ✅ J.8.4 In Build, the selected door or window shows its distances to the nearest walls, as in Plan (added 2026-11-16, Julia)
- ✅ J.2 Room as corners: store, floor, walls, camera-facing wall fade, Room render, clamping, save and open with old files.
  - ✅ J.2.1 Geometry helpers for a room of corners (`src/store/roomShape.js`): rectangle, bounding box, walls with their outward side, validity, point inside, where a footprint fits, distance to a wall; tests only, no visible change (added 2026-11-11)
  - ✅ J.2.2 The room becomes corners everywhere: store, clamping, placement, Location limits, wall distances, walls and floor, the Walk wall stop, project file version 2 with old files still opening, a message for a broken room (added 2026-11-11)
- ✅ J.3 Corner origin: Location numbers in Object details.
- ✅ J.4 Shape buttons: Square, Rectangle, L with rotate. The Build button stays disabled until J.5. New Project starts as the 5 × 5 m Square (added 2026-11-12, moved here from J.2.2).
  - ✅ J.4.1 Rectangle from a Square: it keeps the width and is 3/4 as deep (at least 2 m), so it no longer looks like the Square (added 2026-11-12, found by Julia)
  - ✅ J.4.2 Hovering a Room configuration field highlights the walls it moves, in clay with a line on the floor (added 2026-11-12, Julia)
- ✅ J.5 Build tab: top view, wall labels with typed length, furniture hidden, pan and zoom, notice on leaving.
  - ✅ J.5.1 Wall lengths in the view are plain text; a length is typed only in the panel, for the selected wall (added 2026-11-13, Julia)
  - ✅ J.5.2 Build's floor has a grid: a dotted line at every whole meter from the origin corner and a solid line every 5 m, inside the room (added 2026-11-16, Julia: dots every 1 m, a line every 10 m; changed to 5 m, see the requirement)
  - ✅ J.5.4 Build's Room configuration shows all the room's sizes, not only Height: the same fields as in Plan (added 2026-11-16, Julia)
  - ✅ J.5.3 The room's sizes, like a floor plan: dimension lines along its back and left side with the lengths (Plan's 2D view: a chain along the back and left; Build: one line per wall), and its area in the middle of the floor in Build and 2D (added 2026-11-16, Julia, from a floor plan reference)
  - ✅ J.5.5 Build shows a legend in its bottom left corner: a square of dots, 1 m on each side at the view's zoom, labelled "1 m²" (added 2026-11-16, Julia)
- ✅ J.6 Move a wall.
- ✅ J.7 Cut and drag.
  - ✅ J.7.1 Cut at a point: Cut sits in Wall tools (the Openings section renamed); a point follows the pointer on any wall with its distance to both ends; a click splits the wall in two there; a typed length of a piece ending at the cut point slides the point; walls that do not meet stay 0.5 m apart (added 2026-11-13, Julia)
- ✅ J.8 Doors and windows in Build. The project file saves and opens `openings` (added 2026-11-12, moved here from J.2.2).
  - ✅ J.8.1 Place a door with the pointer: a 0.90 m door follows the pointer on any wall with its distances to the wall's ends; one click places it (added 2026-11-13, Julia)
    - ✅ J.8.1.1 A Default size button in a door's or window's details puts its width and height back to the standard size (added 2026-11-15, changed 2026-11-16, Julia)
  - ✅ J.8.2 Place a window with two clicks: where it starts, then where it ends, with a preview of its size, on any wall (added 2026-11-13, Julia)
  - ✅ J.8.3 Wall options: a click on a wall shows a small bar next to it with Cut, Door and Window (added 2026-11-13, Julia)
- ⬜ J.9 Doors and windows in Plan: list group, details, move and resize.
  - ✅ J.9.1 Openings group in Plan's Objects section: select one, its details and Delete, an outline in the view (added 2026-11-15, Julia)
    - ✅ J.9.1.1 A door or window's fields change it while typing or stepping, not only once final (added 2026-11-15, found by Julia)
  - ✅ J.9.2 Select and drag a door or window on its wall in Plan's 2D and 3D views, with its distances to the walls, floor and ceiling (added 2026-11-15, Julia)
  - ✅ J.9.3 Arrow keys move the selected door or window (added 2026-11-15, Julia)
  - ✅ J.9.4 Add doors and windows in Plan with the placing tools, in 2D and 3D (added 2026-11-15, Julia)
- ✅ J.10 Undo and redo in Build, and the 1, 2, 3 mode shortcuts.
- ⬜ J.11 Personalize with openings: check the AI keeps doors and windows, adjust the prompt if not. Update docs and run the verifier.
  - ✅ J.11.1 The request sends each door's and window's rectangle in the Room render, and the prompt (v10) lists them, so they keep their place and size (added 2026-11-16, from Julia's check with v9)
  - ⬜ J.11.2 Reference cards for doors and windows in Personalize: a photo or Creative for each, like the furniture (added 2026-11-16, Julia)

## Acceptance criteria
- [ ] J0.1: with the divider dragged fully left, at 1280 px and at a wide window, every number in Room configuration and Object details is fully visible.
- [ ] J0.2: pressing on a sofa and moving the mouse moves it, also zoomed out; it turns only when I grab the rotate ring.
- [ ] J0.3: while dragging, the label shows the same X and Z as Object details shows after the drop. (replaced by J0.3.1)
- [ ] J0.3.1: a sofa dragged 30 cm straight shows one number, "30 cm", with an arrow the way it moved on screen; a diagonal drag shows two; 1 m and more shows in meters.
- [ ] J0.4: a selected sofa shows four lines with distances that add up to the room size minus its footprint, for a turned sofa too, and they update while dragging.
- [ ] J0.5: Ctrl+S saves in all modes; Ctrl+O opens in Plan and Build; arrows nudge 10 cm (Shift 1 cm) and one Ctrl+Z undoes a burst; Backspace with the color field or a button focused does not delete.
- [ ] J0.6: Ctrl+D and the Duplicate button make "Sofa 2" next to "Sofa 1", selected, inside the walls; one Ctrl+Z removes it.
- [ ] J.1.1: 2D shows the room from above, front wall at the bottom; a sofa can be dragged and turned there; wheel zooms and empty space pans; back in 3D the camera is where I left it; the camera slots and frame guide show in 3D only.
- [ ] J.1.2: in Walk I look around by dragging the view and walk with W A S D or the arrows at eye height; the mouse is never locked; I cannot walk through a wall; switching to Personalize from Walk shows the same Room render as from 3D.
- [ ] J.2: an old file opens with everything in the same place; an L room keeps furniture out of the notch (and Walk stops at the L's walls); the Room render of a rectangle room looks as before; a file with a broken room is refused with a message.
- [ ] J.3: an object pushed into the front left corner shows Location 0, 0; typing a Location puts its front left corner there.
- [ ] J.4: Square, Rectangle and L set the room; the L rotate button moves the notch; pieces pushed in show the notice.
- [ ] J.5: Build shows the room from above with wall lengths; a typed length moves the far end; Build → Personalize shows the Room renders; leaving Build moves pieces inside with the notice.
- [ ] J.6 to J.9: the spec's rules hold (5 cm snap, 0.5 m walls, no crossing, openings fit their wall and the room height); each step can be undone.
- [ ] J.10: Ctrl+Z works in Build; 1, 2, 3 switch modes.
- [ ] J.11: prompt runs with a door and a window are in `docs/prompts/restyle.md`, with the decision.
- [ ] No console errors; `npm run build`, `npm run lint` and `npm test` succeed; deployed and working on the live site.

## Backlog
- Moved to [docs/BACKLOG.md](../BACKLOG.md) on 2026-11-12, the one place for backlog ideas.

## Open questions
- None blocking. Answered 2026-11-10 (Julia): the Build tab is always in the top bar; arrow keys move relative to the screen, snapped to the nearest room axis; a typed wall length moves the end farther from the origin; the move readout shows the new position (later changed by J0.3.1 to the distance moved).

## Changelog
- 2026-11-10: Draft written (Julia).
- 2026-11-10: Spec approved, Part J started (In progress). Open questions answered. From the code survey: Ctrl+O in Plan and Build only; Build → Personalize passes through Plan; shown Z counts from the front wall (world +z); old files keep world coordinates; New Project is a 5 × 5 m square; openings live in `room` so undo covers them; file version 2.
- 2026-11-11: J.1 split (Julia): J.1.1 the geometry helpers with tests, J.1.2 the switch to corners everywhere.
- 2026-11-12: New J.1, views in Plan (Julia): 2D (top view, furniture editable), 3D and Walk (mouse look and W A S D, view only), Plan only. Julia chose to renumber this once, against the never-renumber rule, since no J task was committed yet: the old J.1 to J.10 are now J.2 to J.11 (the geometry helpers are J.2.1, the switch to corners J.2.2). Entries above use the old numbers.
- 2026-11-12: Walk controls changed before J.1.2 was committed (Julia): no pointer lock; dragging the view turns the head, W A S D walk. A joystick circle was tried (to walk, then to look) and dropped.
- 2026-11-12: Every part's Backlog moved to one file, `docs/BACKLOG.md` (Julia); items already built or planned as J tasks were left out.
- 2026-11-12: J.3 (Julia): Location shows the front left corner of the piece's footprint instead of its middle, so a piece pushed into the origin corner shows 0, 0.
- 2026-11-13: New wall tools in Build (Julia): wall lengths as plain text in the view, typed in the panel (J.5.1); Cut splits any wall at a point shown with its distances, from the Openings section renamed Wall tools, and a typed piece length slides that point; walls that do not meet stay 0.5 m apart, so a dragged wall stops before another (J.7.1, replaces the 1 m piece); Door and Window are placed with the pointer, a door in one click and a window by its start and end (J.8.1, J.8.2; the panel buttons no longer add one in the middle of a wall); a bar next to a clicked wall with Cut, Door and Window (J.8.3).
- 2026-11-15: J.8.1 and J.8.2 as built: the door and window previews show within 1 m of a wall and stop 0.1 m before its ends; a window's second click stays on its first wall, either way, with its width highlighted; where one cannot go it is red and a click does nothing. Nothing adds a door or window in the middle of a wall any more.
- 2026-11-15: J.9 split in four (Julia): the Openings group with details (J.9.1), dragging (J.9.2), arrow keys (J.9.3), and adding them in Plan too, with the placing tools in 2D and 3D (J.9.4, new).
- 2026-11-15: From Julia's check of J.9.1: the fields change a door or window while typing (J.9.1.1, new); J.9.2 also shows its distances to the walls, the floor and the ceiling while selected.
- 2026-11-15: From Julia's check of J.9.1.1: a door against a wall's end could not get wider; Width now grows it back toward the wall's start there (J.9.1.1). The Door tool gets two clicks and a Default size button (J.8.1.1, new).
- 2026-11-16: J.8.1.1 changed (Julia): the Door tool stays one click at 0.90 m; Default size is a button in the door's or window's details that puts its standard size back.
- 2026-11-16: J.9.2 as built: the distance lines look past a cut point; in 2D the floor and ceiling distances are one label. A door or window is pressed by its face or by its wall from above, never by the room in front of it, so furniture against the wall stays pressable.
- 2026-11-16: J.9.3 as built: the arrow keys follow the way the wall runs on screen (not snapped to a room axis, so a window on a side wall still moves from the corner view); Up and Down lift a window in 3D and otherwise move along a wall that runs away from the camera; no Shift step.
- 2026-11-16: From Julia's check of J.9.3: Plan's 2D view is flat, with no shadows or shading (J.1.3, changed from a shadows bug); Build shows the selected door or window's distances to the walls like Plan (J.8.4, new); 2D shows each piece's name (J.1.4, new). From Julia's check of J.1.4: 2D shows every door and window, as they only showed when selected (J.9.5, new), as the floor-plan symbol Build draws plus its name, from Julia's reference (a window as thin lines in a gap in the wall, a door with a faint swing); a door gets an Opens switch, inside or outside (J.8.5, new).
- 2026-11-16: From Julia's check of J.8.5 and J.9.5: a door can be flipped to the other hinge side (J.8.6, new).
- 2026-11-16: From Julia's check of J.5.2 and J.5.3: Build's wall lengths become dimension lines like Plan's (J.5.3), and Build's Room configuration shows all the room's sizes, not only Height (J.5.4, new). The grid is dotted lines, not single dots (J.5.2).
- 2026-11-16: J.11, Julia's first Generate with a window (prompt v9): it became a real window on its wall, but taller than its rectangle. So the app now sends each door's and window's rectangle and the prompt lists them (J.11.1, new, prompt v10). Julia also noted there is no reference card for a door or window (J.11.2, new).
- 2026-11-16: From Julia's check of the grid: Build shows a scale legend, a dotted square of 1 m² in its bottom left corner (J.5.5, new).
- 2026-11-16: From Julia's floor plan reference: a grid floor in Build, dots every meter and a line every 5 m instead of 10 (J.5.2, new), and the room's sizes as dimension lines plus its area, in Build and 2D (J.5.3, new; an area label was out of scope before).
