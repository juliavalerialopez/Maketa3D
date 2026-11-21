# Part K: The room, the furniture and the canvas

Status: **Not started**. Builds on Part J (room shapes, Build, doors and windows, camera slots), Part D (arrange) and Part I (undo). One part with eight blocks, in this order: K.1 Room panel (with the dark palette), K.2 Furniture, K.3 Canvas navigation, K.4 Architecture clean-ups, K.5 Angled walls, K.6 Wall thickness and snap to wall, K.7 Controls redesign and scene toolbar, K.8 Walk look and feel. K.2 needs K.1.2 and K.1.5 (the number functions and `MeasureField`). K.3 does not depend on K.1 or K.2 except for the palette (K.1.1), so it can go before K.2.

## Goal
### K.1 Room Configuration panel and the dark palette
1. The dark theme takes the new dark green palette, once (K.1.1).
2. Room configuration shows three preview cards, **Standard**, **L-shape** and **Custom**, with the sizes of that shape as stacked rows (label left, field right), grouped as Floor, Cut-out and Ceiling.
3. Sizes are typed as text in meters (comma or dot), checked against limits, and refused with an inline message when invalid (no silent clamping).
4. A read-only floor area, a link toggle for Width and Depth, a corner picker for the L's cut-out, and a Reset room button.
5. Door and Window leave Plan's panel (Build keeps Wall tools). (changed 2026-11-21: they come back in K.1.13)
6. (added 2026-11-21) Build is deleted. Plan's 2D view takes the wall tools that stay (drag walls, a Cut tool turned on by the Custom card, the grid, the scale legend and the walls' dimension lines), K.1.13 to K.1.17.

### K.2 Furniture
1. A **Furniture** section replaces the Objects chips: four category tiles and "Your item" add one default piece each, in a smart spot of the room.
2. An **In this room** list manages the pieces: select (two ways with 3D), rename, remove, hide and lock.
3. **Object details** shows only what describes the piece: name, type (a grid of pictures), size, and the settings its type needs.
4. 22 types plus a box, kept in a catalog that also holds data for a future AI layout tool.

### K.3 Canvas navigation and help
1. The 2D · 3D · Walk switch shows the active view clearly (a solid sage pill).
2. Each view explains its controls with one shared hint pattern (a strip or pill that fades after the first interaction, and a "?" button that brings it back).
3. Walk has a hint strip with keycaps that light while held, Esc to leave, and a mini-map to walk to a point or a camera.
4. 3D has a view cube that follows the real camera, with face clicks and two 45° rotate buttons, and sensible orbit limits.
5. 2D dimension labels are never cut off at the edge of the canvas.

### K.4 Architecture clean-ups (before angled walls)
1. The wall math, the selection, the pointer drag and the keyboard shortcuts each live in one place, so angled walls (K.5) land on shared code and not on copies.

### K.5 Angled walls
1. A room can have walls at any angle, not only along the two axes. Furniture, doors and windows, Walk and the Room render all work in it.

### K.6 Wall thickness and snap to wall
1. Walls have a thickness I can choose, and a piece dragged near a wall snaps flush against it.

### K.7 Controls redesign and scene toolbar
1. The remaining buttons and fields get the new look, and the scene's tools sit in one toolbar over the view.

### K.8 Walk look and feel
1. Walk looks and feels better (the list of what is wrong comes from Julia first).

## Decisions
- (2026-11-21, Julia) Everything is in Part K. Tasks are numbered `K.<block>.<n>` like Part J (K.1.1, K.2.3). Task numbers are never renumbered once a task is done.
- **Cut line:** if Part K runs long, K.6 to K.8 move to a Part L as new blocks. K.1 to K.5 are the part.
- Tooling for the whole part: pure functions in `node:test` tests (the project has no Jest); Playwright only as a scratch script run by hand, never in `package.json`; colors only as role variables.

### K.1 Room Configuration panel and the dark palette
- The room stays a closed list of corners. `room.shape` becomes `'standard' | 'l' | 'custom'` (`'square'` and `'rectangle'` go away). The project file never stored a shape, so no saved file changes.
- Limits: Width and Depth 1 to 30 m, Height 2 to 6 m. Cut-out sides from 0.5 m up to the room side minus 0.5 m. Width and Depth cannot go below the cut-out plus 0.5 m. Height cannot go below the tallest door or window.
- A typed size, a stepper press or a shape change that would leave a door or window not fitting its wall is **refused**: the field keeps its last value and the message names the opening. (Today they are quietly fitted or dropped.)
- Reset room: one undo step, no confirm dialog (undo covers it); it removes doors and windows and says so in its tooltip.
- Door and Window are removed from Plan's panel only. Doors and windows stay in the view, selectable by click, editable in Object details, deletable with Delete. The placing tools' code (J.9.4) stays but nothing turns it on in Plan until the build-mode work.

### K.2 Furniture
- (2026-11-21, Julia) New piece goes to a **smart spot**: a table in front of the sofa, storage against a wall, otherwise the nearest free spot to the room center. She can also drag a tile into the room (K.2.15).
- A type change keeps a size the user changed; otherwise it takes the new type's default. A bigger piece grows from its center and is pushed inside the walls.
- **Hide** = not drawn and not selectable, also left out of the Room render and the AI (the faded look and today's meaning, H.6.2, go). **Lock** = cannot be moved or rotated in 3D (no drag, no widget, no arrow nudge); Delete still works.
- Object details keeps Color, Duplicate and Delete (the Room render uses the color; Ctrl+D and Delete still work) and the settings a type lists: the TV stand's screen size, the L-shaped sofa's chaise side. Location and Rotation fields leave (the 3D widget and the arrow keys do it); Part J's J.3 criterion (typing a Location) is retired.
- The front arrow shows on the **selected piece only**. Dragging the 3D selection box to resize is **not** built; a focused size field only highlights its edge on the box.
- Custom names go to the AI as the type's name ("Sofa"), never the custom text.
- Clicking a hidden row selects nothing; its eye, rename and remove still work.

### K.3 Canvas navigation and help
- (2026-11-21, Julia) The "Frame" button (the 16:9 frame guide) is **not renamed and not changed**. "Fit room" and "Frame selection" were dropped from this part and go to the backlog.
- The R3F camera stays the single source of truth. A bridge inside each canvas **mirrors** it into a small `cameraPoseStore` (written only by the bridge; read by the cube, the hints and the map). Requests (go to a face, rotate 45°) go the other way as one-shot `viewRequest`s.
- Camera bookmarks are the existing camera slots, saved as before. A slot is a 3D orbit camera, usually high and outside the room, so a Walk map pin shows only when the slot's x and z are inside the room (most will not). Accepted for now.
- Hint state is per session, not saved. Under `prefers-reduced-motion`, camera moves are instant and fades are off.
- The dark theme palette comes from K.1.1; new overlays use `--overlay` with a 1 px `--border`, flat (no shadows). The view switch's pill is a `variant="pill"` of `SegmentedSwitch`, so other switches are unchanged.
- Esc in Walk goes back to 3D (new). The Shift "Faster" item stays in the Walk strip.

## Out of scope
### K.1 Room Configuration panel and the dark palette
Mobile layout.

### K.2 Furniture
Build mode, door and window tools, the personalize mode and scanning, the AI layout tool itself, mounting Wall art on a wall, the Rug layering rule, choosing a type directly from the library tiles, resize handles, mobile layout.

### K.3 Canvas navigation and help
A "Fit room" or "Frame selection" button, renaming "Frame", saving a Walk position with a bookmark, mobile layout. (The toolbar is K.7, Walk look and feel K.8.)

Whole part: curved walls, drawing walls freehand, several rooms, sloped ceilings, imperial units, mobile layout, color swatches, dragging the 3D selection box to resize.

## Requirements
### K.1 Room Configuration panel and the dark palette
#### Palette (K.1.1)
The dark theme's role variables in `src/index.css` take: `--bg` #1b2420 (panel), `--surface` #222c27 (tiles), new `--plate` #2d3b35, `--accent` #b7d3a8 (sage), `--on-accent` #14201a, `--text` #eef4ef, `--muted` #a7b8ae, `--border` #34443d, and a new `--overlay` rgba(24,33,29,.93) (the light theme gets an ivory `--overlay` at .93). Colors only; the light theme and every component stay as they are. Text 4.5:1 or more, graphics 3:1 or more; the light theme's `--muted` on `--bg` is about 4.1:1 and is fixed in K.1.11.

##### Measured contrast (K.1.11, 2026-11-21)
Text needs 4.5:1, a control's outline and graphics 3:1. A new role variable `--control-border` is the outline of the Room panel's controls; the light theme's `--muted` went from #6f786f to #5f695f (it was 4.1:1 on the panel and 3.7:1 on the fields).

| Pair | Light | Dark |
|---|---|---|
| Text on panel (`--text` on `--bg`) | 13.4 | 14.3 |
| Text on field | 12.0 | 13.1 |
| Muted text on panel | 5.1 (was 4.1) | 7.7 |
| Muted text on field | 4.6 (was 3.7) | 7.1 |
| Sage or forest (`--accent`) on panel | 7.9 | 9.8 |
| `--accent` on the tinted fill (`--soft`) | 5.2 | 4.7 |
| Text on the tinted fill | 8.8 | 6.8 |
| Text on sage (`--on-accent`) | 10.3 (dark) | 10.3 |
| Error text on panel | 5.8 | 7.0 |
| Control outline (`--control-border`) on panel | 3.5 | 3.7 |
| Control outline on field | 3.2 | 3.4 |

The control outline is thin lines, so it needs 3:1: the old `--border` was 1.3 (light) and 1.6 (dark) and stays for dividers and cards only. Checked in the browser at 1280 px and 1920 px, in both themes, with the divider fully left (the panel is then 276 px wide): every button and field in Room configuration is at least 36 px, none sticks out of the panel, none lacks a name, and every icon-only button has a tooltip. Tab shows a 2 px focus ring on each control.

#### Shape cards
- Three cards in one row, each a floor-plan icon and a name. Active: sage (`--accent`) outline, `--soft` tinted fill and a small check (three cues). **Custom** has a dashed border and only opens Build, as the pencil button does today; when the room was shaped in Build, Custom shows active and its fields are read-only (Height still editable), with the note "Custom shape. Edit it in Build."
- Standard = a rectangle (a Square is a Standard with the link on). L-shape = the existing L preset.

#### Fields
- Rows: label in a fixed 56 px column on the left, field on the right. Group headers: **Floor** (Width, Depth, link toggle between them, Floor area), **Cut-out** (L-shape only: Cut-out width, Cut-out depth, corner picker), **Ceiling** (Height). Floor area is read-only, m² with one decimal (Standard: width × depth; L: width × depth minus cut-out width × cut-out depth).
- Link toggle (Standard only): on sets Depth = Width (one undo step); while on, editing either field sets both. A Build edit that makes the sides unequal turns it off. A new project starts linked; a file opens linked when its sides are equal. The flag lives in `room.linked` (undo covers it) and is not saved.
- Input: real text input (`inputMode="decimal"`), unit "m" inside the field, select all on focus, Enter or blur commits, Escape puts back the last valid value. Comma and dot are both decimal separators. ArrowUp and ArrowDown step 0.1, Shift 1. Small − and + steppers move by 0.1. Invalid or out-of-range input keeps the last valid value and shows a short message under the group (`role="status"`, `aria-invalid` on the field). Controls at least 36 px tall; icon-only buttons have an `aria-label` and a tooltip.
- Drag-to-change is not on these fields. Hovering or focusing a field still highlights the walls it changes (J.4.2).
- A typed value is applied when it commits, so the `base` workaround for half-typed numbers goes.

#### L-shape corner picker
Four buttons (top-left, top-right, bottom-left, bottom-right) drawn as a small floor plan with the **front wall marked**, in the orientation of 2D and Build (front at the bottom), naming the corner where the cut-out is. It sets the notch directly: top-left = index 2 (back left), top-right = 3 (back right), bottom-left = 1 (front left), bottom-right = 0 (front right, the default). It does not depend on the 3D camera. It replaces the rotate button.

#### Reset room
An icon button with tooltip and `aria-label`: the room becomes the default (Standard 5 × 5 m, linked, 2.6 m high, no doors or windows), furniture is fitted inside by the same rule as a shape change (with the notice), and it is one undo step. Never refused by the openings rule.

#### Build removed, its wall tools in Plan (added 2026-11-21, Julia)
- The Build mode and its tab in the top bar are deleted. What stays of it moves into Plan's 2D view: the dotted floor grid, the 1 m² scale legend and the walls' own dimension lines (J.5.2, J.5.3, J.5.5; in 2D only, never in 3D, Walk or a Room render); selecting a wall (clay color) and dragging it in 5 cm steps with the J.6 and J.7 rules; and the Cut tool (J.7.1).
- **The Custom card is a tool button**, not a shape: it turns the Cut tool on and off, and it is never highlighted as the room's shape. It shows a pressed look only while the tool is on. Esc or a second click turns the tool off. The tool works in 2D (a point follows the wall under the pointer in 5 cm steps, as in Build) and in 3D (picking a wall's inside face, as the door and window tools do). That is the only difference between the three cards.
- A room whose walls were cut or dragged out of a rectangle or L has the shape 'custom': **no shape card is highlighted**, Width and Depth are read-only (Height stays editable), and the note says so ("Custom shape. Drag its walls in 2D, or cut one with Custom.").
- Door and Window buttons, the placing-tool notice and the Openings list come back in Plan's panel (what K.1.9 removed on the idea that Build would hold them).
- Dropped with Build: typing a wall's length in a Wall section, the wall bar (Cut, Door and Window beside a selected wall), furniture hidden while editing walls. Furniture stays visible; when a wall drag or cut ends, pieces outside the walls are pushed inside with the notice, in the same undo step.
- Keys 1, 2, 3 (J.10): Build is gone, so 1 is Plan and 2 is Personalize.

#### Old names
`shapeFor(corners)` returns `'standard'` for any rectangle. `normalizeShape('square' | 'rectangle')` returns `'standard'` for any caller still using the old names. The Square/Rectangle switching logic (`RECTANGLE_DEPTH`) is deleted.

#### Pure functions (`src/store/roomMeasure.js`, tests in `tests/roomMeasure.test.js`)
`parseMeasure(text)`, `validateMeasure(value, [min, max], name)`, `stepMeasure(value, direction, shift)`, `floorArea(params)` (equals `roomArea(corners)` for the same room), `formatArea(m2)`, `limitsFor(params, key, tallestOpening)`, `normalizeShape(name)`, `openingsFit(room, nextRoom)`. K.2 reuses the first three.

#### Components
`RoomInputs.jsx` keeps the store wiring, gestures, the notice and the hover highlight. New: `ShapeCards`, `FloorGroup`, `CutoutGroup`, `CornerPicker`, `AreaReadout`, `LinkToggle`, `GroupMessage`, `ResetButton`; new shared controls in `src/components/ui/`: `MeasureField` (replaces NumberField in this panel only) and `ShapeCard`. NumberField stays for the other panels.

### K.2 Furniture
#### Library (adds pieces)
- Four tiles in a 2 × 2 grid, each one button with an icon and the category name only: **Sitting** (adds a Sofa), **Tables** (Coffee table), **Storage** (Bookshelf), **Light and decor** (Floor lamp). Below, one long dashed button "Your item" with "Starts as a box" (a 1.0 × 1.0 × 1.0 m box named "Item").
- A chevron collapses the tiles into a slim bar of 5 icon-only buttons with tooltips. Collapsing is manual only (never after an add). A saved room with 3 or more pieces opens collapsed. State in `uiStore`, session only.
- Icons: sage `--accent` on a lighter rounded `--plate`, stroke 1.8, 3:1 contrast or more; dashed outline for anything that is a placeholder.

#### In this room
- Heading "In this room (n)". Empty: "Nothing here yet" and "Add your first piece of furniture."
- After an add: the piece is selected in 3D and in the list, its row flashes (1.2 s, not under `prefers-reduced-motion`) and scrolls into view.
- Row: type icon, name, size text (W × D m). One `selectedId`: a click on a row selects the piece, a click on the piece selects the row.
- Rename: double-click, F2 or the pencil; Enter commits, Escape cancels, blur commits; trim; 1 to 40 characters (more is refused with a message, not cut); empty reverts; duplicates allowed. New pieces auto-number by type: Sofa, Sofa 2, Sofa 3.
- Row actions (rename, remove) appear on hover, keyboard focus and when selected. Delete removes the selected row. No confirm dialog; undo covers it.
- **Hide and lock treatment (for Julia's review).** Eye = shown, eye with a line = hidden (existing icons); padlock open = free, closed = locked. A hidden or locked row always shows its icon; the free and shown icons appear on hover, focus and selection. ON state uses two cues: `--soft` plate and `--accent` outline on the icon, and for hidden the name in `--muted` with a dashed row outline. A locked piece keeps its selection box drawn dashed and shows no move arrows or ring.
- Undo covers: add, remove, rename, type change, size change, hide, lock.
- Keys: rows are focusable; Enter or F2 renames; Delete removes (not while a field is focused).

#### Object details (selected piece)
- Header: preview of the current type, an editable name, the category as a subtitle.
- Type grid: 4 columns of picture tiles with the type name under each; selected = 2 px `--accent` outline and a tinted fill. None for "Your item" (name and size only).
- Size: Width, Depth, Height as `MeasureField` ("m" inside), range 0.01 to 10 m, comma or dot, select all on focus, Enter or blur commits, Up/Down 0.1, Shift 1, invalid keeps the last value with an inline message. "Reset to default size" appears only after a size changed (`sizeChanged`, false again when the default is typed back). Focusing a field highlights the matching edge and a dimension label on the selection box.
- Below: the type's own settings, Color, and Duplicate and Delete.
- Switching type keeps position, rotation, locked, hidden and color; the name follows the new type only while it was still a default name (`^<label>( \d+)?$`); the size resets only while `sizeChanged` is false. The TV stand's `screenInches` is set or dropped. The piece is pushed inside the walls. One undo step.

#### Catalog (data, `catalog.js`, plain JS)
`CATEGORIES` (label, default type, icon) and `OBJECT_TYPES[typeId]`: `label`, `category`, default `size`, `color`, `front` ('+z' or null: the side that faces out at rotation 0; all models face +z), `clearance` (m needed in front), `placement` ('floor' | 'surface' | 'flat' | 'wall'), `wall` ('against-wall' | 'freestanding' | 'either'), `role` ('seat' | 'surface' | 'storage' | 'light' | 'focal' | null), `model`, and optional `options` (screen size for the TV stand, chaise side for the L-shaped sofa). Existing ids stay (`sofa`, `coffeeTable`, `armchair`, `bookshelf`, `floorLamp`, `tvStand`). Models are simple and for reference only; 7 families built from `Parts.jsx` (table, chair, sofa, cabinet, plant, flat panel, box), not 16 hand-made models.

Sizes marked * and **every** clearance, wall and role value are Claude's guesses for Julia to correct. Sizes in meters, W × D × H.

| Type | Category | Size | Front | Clearance | Wall | Role |
|---|---|---|---|---|---|---|
| Sofa | sitting | 2.0 × 0.9 × 0.8 | +z | 0.9 | either | seat |
| L-shaped sofa | sitting | 2.6 × 1.6 × 0.8 * | +z | 0.9 | against-wall | seat |
| Armchair | sitting | 0.8 × 0.85 × 0.85 | +z | 0.6 | either | seat |
| Lounge chair | sitting | 0.75 × 0.85 × 0.8 * | +z | 0.6 | either | seat |
| Dining chair | sitting | 0.45 × 0.5 × 0.9 * | +z | 0.6 | freestanding | seat |
| Office chair | sitting | 0.6 × 0.6 × 1.0 * | +z | 0.8 | freestanding | seat |
| Stool | sitting | 0.35 × 0.35 × 0.65 * | none | 0.4 | either | seat |
| Bench | sitting | 1.2 × 0.4 × 0.45 * | +z | 0.6 | either | seat |
| Coffee table | tables | 1.0 × 0.55 × 0.4 | none | 0.4 | freestanding | surface |
| Side table | tables | 0.45 × 0.45 × 0.5 * | none | 0.3 | either | surface |
| Dining table | tables | 1.6 × 0.9 × 0.75 * | none | 0.9 | freestanding | surface |
| Desk | tables | 1.4 × 0.7 × 0.75 * | +z | 0.9 | against-wall | surface |
| Console table | tables | 1.1 × 0.35 × 0.8 * | +z | 0.6 | against-wall | surface |
| Bookshelf | storage | 0.8 × 0.3 × 1.8 | +z | 0.8 | against-wall | storage |
| TV stand | storage | `tvStandSize(55)` | +z | 1.5 | against-wall | focal |
| Sideboard | storage | 1.6 × 0.45 × 0.8 * | +z | 0.8 | against-wall | storage |
| Cabinet | storage | 0.9 × 0.4 × 1.0 * | +z | 0.8 | against-wall | storage |
| Wardrobe | storage | 1.0 × 0.6 × 2.1 * | +z | 0.9 | against-wall | storage |
| Floor lamp | decor | 0.36 × 0.36 × 1.7 | none | 0 | either | light |
| Plant | decor | 0.4 × 0.4 × 1.0 * | none | 0 | either | focal |
| Rug (placement flat) | decor | 2.0 × 1.4 × 0.02 * | none | 0 | freestanding | none |
| Wall art (placement wall) | decor | 0.6 × 0.04 × 0.8 * | +z | 0 | against-wall | focal |
| Your item (box) | custom | 1.0 × 1.0 × 1.0 | none | 0 | either | none |

Wall art stands on the floor against a wall for now (wall mounting is out of scope). The L-shaped sofa's chaise side flips the model; the front arrow and the front sent to the AI follow it.

#### Placed piece (store)
`{ id, type, name, customName, size, sizeChanged, position, rotation, color, visible, locked, screenInches?, options, modelRef }`. `number` and `lastNumbers` go away: numbering comes from the names in the list. `modelRef` is null (the future replacement of a box). Migration on open: `name` = "<label> n" (so "Sofa 1" stays), `customName` false, `hidden: true` becomes `visible: false`, the rest default; old files open, new files need the new file version. Names are stored in `objects`, so undo and redo cover them.

#### Smart spot (`smartSpot`, deterministic)
First valid spot (inside the walls, no overlap with a visible piece, not blocking a door) of: (1) `against-wall` types along the walls, back to the wall, front to the room, longest free run first; (2) a Coffee table 0.4 m in front of the largest seat that has a front, turned like it; a Side table beside it; (3) a seat facing the TV stand at its clearance, a Dining chair beside a Dining table facing it; (4) a Rug under the middle of the seats and tables, else the room center; (5) a light or plant in a free corner beside the seat; (6) the nearest free spot to the room center (spiral, 0.1 m steps). Add, place and select are one undo step. Stage 1 (6 and 1) ships first, stage 2 (the relations) after the new types.

#### Preview images
`scripts/render-type-previews.mjs` (Node, Playwright installed `--no-save`, never in `package.json`) opens the dev app on a dev-only route `?previews` and renders each model with one camera (orthographic, 35° from the front right, 25° up), the same three lights, fitted to the frame, the type's catalog color, on a transparent background. Saved as `public/previews/<typeId>.png`, 256 × 256 (shown at 64 px), on a `--plate`-colored tile (about #cfc9b8 in the type grid), referenced as URL strings, never imported. Re-run when a model changes. The "Your item" tile and category icons are SVG.

#### Pure functions (`src/store/furniture.js`, tests in `tests/furniture.test.js`)
`nextName`, `isDefaultName`, `validateName`, `validateSize` (uses K.1.2's `parseMeasure` and `validateMeasure`), `typeSwitch`, `isSizeChanged`, `sizeText`, `typesIn`, `shouldStartCollapsed`, `selectableIds`, `migrateObject`, `smartSpot`, `overlaps`.

#### Components
`FurnitureSection`, `LibraryHeader`, `LibraryTiles` (`CategoryTile`, `YourItemButton`), `LibraryBar`, `InThisRoom` (`EmptyState`, `ObjectRow` with `RowActions`, `EyeToggle`, `LockToggle`), reduced `ObjectDetails` (`DetailsHeader`, `TypeGrid`, `SizeFields`, `ResetSizeLink`, `TypeOptions`), scene `FrontArrow` (a helper hidden in snapshots) and the selection-box edge highlight (`uiStore.sizeFocus`). Shared controls in `ui/`: `RenameField`, `TileButton`.

### K.3 Canvas navigation and help
#### View switch
Order 2D, 3D, Walk. Active = solid `--accent` pill with `--on-accent` text; inactive = `--muted`. Focus ring and `aria-label` on each.

#### Shared hint (`ui/CanvasHint`, `HintButton`, `Keycap`)
Content from a config object per view: Walk = a strip (W A S D "Move", mouse "Drag to look", Shift "Faster", Esc "Exit"); 3D = a pill (mouse "Drag to orbit, scroll to zoom"); 2D = a pill ("Drag to pan, scroll to zoom") that starts hidden, so 2D shows only the "?". A hint shows until the first real interaction (3D and 2D: the controls' `start` event; Walk: the first key or look drag), then fades (200 ms) and a round "?" button (aria-label "Show controls", tooltip) takes its place; "?" brings it back. Keycaps light sage while the key is held (`heldKeys` mirror from `WalkCamera`). State in `uiStore.hintShown`, session only.

#### Walk mini-map (Walk only, never in 2D or 3D)
- Bottom-left card, 170 px wide: a top-down plan of the room (rectangle and L outlines), floor, walls, windows, doors and furniture as simple shapes, in the orientation of 2D and Build (front wall at the bottom). Opacity 0.5; 1 on `:hover` and `:focus-within` of the whole card (CSS only, no flicker).
- The player is a dot with a view cone that follows the heading (from the `cameraPoseStore.walk` mirror).
- A collapse chevron in the card header; the collapsed state is in `uiStore.walkMapCollapsed` for the session.
- Clicking a point (or a pin) moves the player there and **keeps the heading** (and pitch). A point counts only if `containsPoint` says it is inside the room, and it lands on `clampInRoom` (the function walking uses, 0.25 m from the walls), so you can never stand where walking cannot reach, also not in the L's notch. Outside the outline nothing happens. Hovering shows a dashed ghost circle at the landing point. `modeStore.moveWalkTo(x, z)` sets `walkView` with the current direction and bumps `walkViewResets`; `WalkCamera` already re-applies it.
- Pins: numbered buttons "Camera 1" to "Camera 3" (aria-label "Go to Camera 1") at the slot's x and z; hidden when outside the outline. The map's free click area is pointer only; keyboard users get the pins and W A S D.

#### 3D view cube
- Top-right card, about 96 px: a CSS 3D cube (HTML, not WebGL, so it can never appear in a Room render or camera thumbnail), rotated by `rotateX(elevation) rotateY(-azimuth)` from the camera mirror. Faces: Front, Right, Back, Left, Top; only visible faces are drawn, and a label hides when its face is nearly edge-on. The face that matches the current view is sage (fill and outline). Each face is a `button` ("Front view").
- Azimuth 0 = Front (camera on +z looking toward −z), 90 = Right (+x), 180 = Back, 270 = Left. Clicking a face moves the camera about 380 ms, ease-in-out, the shortest way around the yaw (Front to Left goes −90°). A side keeps the current tilt, or goes to 28° when coming from Top; Top goes to 88°.
- Two rotate buttons under the cube turn the room 45° left or right, snapping to multiples of 45.
- Orbit: dragging orbits with pitch limited to 8 to 88° above the floor (`minPolarAngle` 2°, `maxPolarAngle` 82°), scrolling zooms between limits taken from the room's size. A saved camera slot outside the limits still renders its Room render from its own view; jumping to it pulls the live camera inside the limits.

#### 2D labels
Every 2D `<Html>` label (room dimensions, piece names, door and window names, wall distances, the move readout and Build's wall labels) shifts back inside the canvas with a 4 px margin, measured from its own size (drei `Html` `calculatePosition`; one shared `ClampedLabel`). Labels are shifted, not flipped. Smallest supported canvas: a 1280 × 720 window with the divider at 50% (a 640 px pane).

#### Pure functions (`scene/cameraViews.js`, tests in `tests/cameraViews.test.js`)
`orbitPose`, `positionFromPose`, `shortestYaw`, `snapYaw`, `faceView`, `currentFace`, `faceOpacity`, `easeInOut`, `clampLabel`, `landingPoint`, `miniMapShapes`, `miniMapToWorld`, `worldToMiniMap`, `visiblePins`, `keycapState`.

### K.4 Architecture clean-ups (before angled walls)
Code health, no change in behavior. Re-run these greps when K.4 starts, since later work added copies: `setPointerCapture`, `wall.length`, `selectOpening(`, `addEventListener('keydown'`.
- **Wall helpers** (`src/store/roomShape.js`): `roomWalls` also gives each wall's `direction` (1 m long); add `alongWall(wall, x, z)`, `wallPoint(wall, along, across)`, `STEP = 0.05` and `snapToStep`. Replace the copies in `openings.js`, the wall code K.1.15 puts in Plan's 2D view, `PlaceOpening.jsx`, `Openings.jsx`, `OpeningDistances.jsx`, `openingPlacement.js`; `WALL_SNAP` in `roomStore.js` becomes `STEP`.
- **One selection store** (`src/store/selectionStore.js`, no DOM): `{ objectId, openingId, wall, tool }`; each select action clears the others, and a selection whose thing is gone is dropped (it listens to the room and objects stores once). `objectsStore.selectedId` and the `uiStore` selection fields move into it; the hand-written exclusivity in `Openings.jsx`, `OpeningList.jsx`, `PlanMode.jsx`, `BuildMode.jsx`, `modeSwitch.js`, `ControlPanel.jsx` and the `BuildScene.jsx` effect goes; `historyStore.apply` stops touching selection.
- **One scene drag hook** (`scene/useSceneDrag.js`): `useSceneDrag({ onStart, onMove, onEnd })` owns the button check, pointer id, capture, pausing the default controls, `beginGesture` and `endGesture` and the clean-up when the thing is removed mid-drag. Used by `Objects.jsx`, `Openings.jsx` and the wall drag of K.1.15.
- **One place for shortcuts** (`layout/useShortcuts.js`, mounted once in `App.jsx`): the shared guards (`focusIsFree`, typing, an open menu or dialog), then keys by mode. Replaces `panel/useObjectShortcuts.js`; deleting a door or window is written once; Ctrl+S and Ctrl+O stay in `ProjectMenu`. K.3's Esc in Walk joins it.

### K.5 Angled walls
Today the room is rectilinear by construction: `isValidRoomCorners` requires every wall along an axis, `moveWall` slides a wall on one axis, walls are axis-aligned boxes, and `fitRegions` and `positionLimits` clamp objects with axis-aligned rectangles.
- **Model and file:** any angle; a segment test replaces the box test (no crossing, each wall at least `MIN_WALL`, `WALL_CLEARANCE` as a distance between segments, a minimum angle between neighbours so a corner is never a needle: default 30°). Project file version 3; version 1 and 2 files still open.
- **Editing in Plan's 2D view (open question):** how to make an angle. Default: drag a corner anywhere, with the wall length and angle shown while dragging, the 5 cm snap and an angle snap (15°) with a key to turn it off. Wall length fields and distances keep working along the wall.
- **Drawing:** oriented walls with mitered corners, wall shading and the walls-facing-the-camera hiding, dimension lines along the wall, the grid origin.
- **Objects:** the rectangle-based clamp (`fitRegions`, `positionLimits`, `clampPosition`) becomes a polygon clamp for the rotated footprint; the object-to-wall distance lines work along the axes still.
- **Doors and windows:** already placed by wall and offset; the flat rectangle takes the wall's angle (Plan 2D and 3D, the placing tools, `Openings.jsx`).
- **Walk and the Room render:** Walk stops at angled walls; `openingFrame` and the wall hiding work; the AI rectangles still match.

### K.6 Wall thickness and snap to wall
- **Wall thickness:** choose how thick a wall is, and select several walls to change them together. Measurements stay inside measurements; thickness grows outward; the wall clearance rule uses it. Range and default: open question.
- **Snap to wall:** a piece dragged near a wall snaps flush against it, and turns to follow an angled wall. Always on or only with a key held: open question.

### K.7 Controls redesign and scene toolbar
- **Style mock first** (`docs/design/maketa-style-v4.html`, as v3 was for Part G); Julia approves it before any code.
- **Controls:** the `ui/` controls K.1 to K.3 did not restyle (Button, IconButton, ListItem, SegmentedSwitch, Toggle, NumberField, ColorField, MenuButton, Dialog, Thumbnail) take the look; changes only in `src/components/ui/` and `index.css` (CLAUDE.md rule); no change in behavior.
- **Scene toolbar** (backlog, Part G): the tools (Cut, Door, Window) and the views in one toolbar over the view, replacing the buttons spread over the panels and the top bar; it reads `tool` from the selection store (K.4.2). A layout sketch in the mock first.

### K.8 Walk look and feel
Not written yet. Julia lists what is wrong today (the view from inside the room, the way of looking, the way of walking); the list becomes the tasks. A joystick circle was tried and dropped (J.1.2).

## Tasks
Each task: implement only it, run `npm test`, `npm run lint`, `npm run build`, stop for review; commit after "good" and tick it here (CLAUDE.md checkpoints).

### K.1 Room Configuration panel and the dark palette
Each task: implement only it, run `npm test`, `npm run lint`, `npm run build`, stop for review; commit after "good" and tick it here.

- ✅ K.1.1 Dark theme palette, once (colors only). *Check:* every screen in the dark theme (Plan, Build, Personalize, dialogs, menus) readable; the light theme unchanged; both themes switch.
- ✅ K.1.2 Pure functions and tests (`roomMeasure.js`). *Check:* `npm test`; nothing changes in the app.
- ✅ K.1.3 Raise the limits (`ROOM_LIMITS`, `layoutFile.js`, `WallLengthField`'s maximum). *Check:* type 30 × 30 and 1 × 1; the Plan camera, grid, scale legend, 2D, Walk and the Room render in a 30 m and a 1 m room; an old file still opens; furniture in a 1 m room is pushed inside with the notice.
- ✅ K.1.4 Store model: `'standard'`, `linked`, `setNotchCorner`, `resetRoom`, old Square/Rectangle logic removed; the old panel gets the least edit to keep running. *Check:* new project, Standard ↔ L ↔ Build, undo each, open an old file.
- ✅ K.1.5 `MeasureField` in the panel's current fields. *Check:* comma and dot, Enter, blur and Escape, invalid value keeps the old one with a message, arrows 0.1 and Shift 1, one undo step per edit, wall highlight on hover and focus, a door that would not fit refuses the size with a message.
- ✅ K.1.6 Shape cards (Custom opens Build). *Check:* each card, keyboard (Tab, Space, Enter), accessible names, both themes.
- ✅ K.1.7 Standard fields: groups, link toggle, Floor area. *Check:* link on sets Depth = Width; either field keeps both equal; off lets them differ; area updates; new project starts linked.
- ✅ K.1.8 L-shape: Cut-out group, the four limits, corner picker; rotate button removed. *Check:* each corner in Plan 3D from two camera angles and in 2D; Width cannot go under cut-out + 0.5 and says why; area = w × d − cw × cd.
- ✅ K.1.9 Door and Window removed from Plan's Objects section (buttons, notice, `OpeningList`); Build unchanged. *Check:* no openings group in Plan; an existing door still shows, can be clicked, edited and deleted; Build still places them; a Generate with a window still works.
- ✅ K.1.10 Reset room. *Check:* resets shape, size, height and removes doors and windows; furniture inside; Ctrl+Z restores all of it.
- ✅ K.1.11 Visual and accessibility pass: contrast numbers (light `--muted` fixed), 36 px targets, focus rings, aria-labels and tooltips, both themes, 1280 px and wide, divider at its 276 px minimum. *Check:* a table of ratios here.
- ✅ K.1.12 Docs: CLAUDE.md Structure (`roomMeasure.js`, `MeasureField`, `ShapeCard`), SPEC.md, Part J's J.9.4 changelog line, backlog.
- ✅ K.1.13 (added 2026-11-21) Door and Window buttons, the tool notice and the Openings list back in Plan's panel (reverses K.1.9, which assumed Build). *Check:* the buttons place doors and windows in 2D and 3D; Esc cancels; the list selects; a Generate with a window works.
- ✅ K.1.14 (added 2026-11-21) The floor aids in Plan's 2D view: the dotted grid, the 1 m² scale legend and the walls' own dimension lines (they replace the chain of dimension lines there; the area stays). 2D only. *Check:* as J.5.2, J.5.3 and J.5.5 in Plan's 2D, in both themes, in a 30 m and a 1 m room; none in 3D, Walk or the Room render.
- ✅ K.1.15 (added 2026-11-21) Wall selection and dragging in Plan's 2D view (J.6, J.7 rules, one undo step per drag). *Check:* hover shows clay, a click selects, a drag moves in 5 cm steps and stops at the limits (0.5 m walls, no crossing, doors and windows, the size limits) with the message; pieces left outside are pushed in with the notice in the same step; furniture, openings and walls can each be dragged without fighting each other.
- ⬜ K.1.16 (added 2026-11-21) The Cut tool from the Custom card, in 2D and 3D. *Check:* Custom turns the tool on and off and is never highlighted as a shape; a point follows the wall with its distances; a click splits the wall; a cut through a door or window is refused with the message; Esc cancels; a cut room has no shape card chosen and read-only Width and Depth.
- ⬜ K.1.17 (added 2026-11-21) Delete Build: the top bar tab, `BuildMode`, `BuildScene`, `BuildPanel`, `BuildOpenings`, `BuildDistances`, `WallLengthField`, `OpeningsSection`, `BuildNotice`, `mode: 'build'`, the leaving-Build rule in `modeSwitch.js`, the 1 and 2 keys, `inBuild` in `RoomInputs`. Docs: CLAUDE.md, SPEC.md, Part J's changelog. *Check:* the top bar has Plan and Personalize; every Build feature that stays works in Plan; old files open; `npm run build`, `npm run lint` and `npm test` pass.

### K.2 Furniture
Each task: implement only it, run `npm test`, `npm run lint`, `npm run build`, stop for review; commit after "good" and tick it here.

- ⬜ K.2.1 Catalog and instance model, no UI change: categories, new fields on the six types, `name`, `customName`, `visible`, `locked`, `sizeChanged`, `options`, `migrateObject`, file read and write, `objectLabel` callers read `object.name`. *Check:* an old file opens with the same names, positions and hidden pieces; save and reopen; Personalize and a Generate request unchanged.
- ⬜ K.2.2 Names and type-switch functions and tests. *Check:* `npm test`.
- ⬜ K.2.3 Smart spot, stage 1 (no overlap, against a wall), used by add. *Check:* add 6 pieces: none overlaps, all inside, also in an L room; storage lands against a wall; Ctrl+Z removes the piece.
- ⬜ K.2.4 Hide and lock in the store and scene (temporary controls in the old list). *Check:* each, with undo and redo; Room render and Generate skip hidden pieces; Ctrl+D copies as unlocked.
- ⬜ K.2.5 "In this room" list: rows, count, empty state, two-way selection, scroll, flash, Delete, hover and focus actions. Replaces `ObjectList`. *Check:* row ↔ piece in 3D and 2D; Tab through rows; a hidden row.
- ⬜ K.2.6 Rename (double-click, F2, pencil; commit rules). *Check:* Enter, Escape, blur, empty reverts, 41 characters refused, duplicates allowed, one undo step, Ctrl+Z while typing.
- ⬜ K.2.7 Library tiles, "Your item" (box model), chevron, icon bar, start collapsed at 3 or more; old chips removed. *Check:* each tile adds one default piece, selected and flashing; the chevron never moves by itself; a file with 3 pieces opens collapsed.
- ⬜ K.2.8 Object details, reduced: header, size fields, Reset to default size, edge highlight, Color, Duplicate and Delete, type options (TV screen size). *Check:* comma and dot, Shift steps, invalid keeps the old value, a focused field lights its edge, Reset only after a change, one undo step per edit, a TV's screen size still sets its width.
- ⬜ K.2.9 Preview images and the type grid with the 6 existing types, plus the switch rules. *Check:* Sofa → Armchair keeps position, turn, lock, hide; default name follows, a custom name stays; a changed size is kept, an untouched one resets; a piece next to a wall is pushed inside.
- ⬜ K.2.10 New models, Sitting (L-shaped sofa with its chaise side, lounge chair, dining chair, office chair, stool, bench), catalog entries, previews.
- ⬜ K.2.11 New models, Tables (side table, dining table, desk, console table).
- ⬜ K.2.12 New models, Storage and Light and decor (sideboard, cabinet, wardrobe, plant, rug, wall art). *Check for K.2.10 to K.2.12:* each type adds, switches, resizes and turns; fits its size box; front faces +z; a Generate works with the new types.
- ⬜ K.2.13 Front arrow (selected piece only, types with a front). *Check:* each front type turned 90° and 180°, not in the Room render or camera thumbnails, none for a type with no front.
- ⬜ K.2.14 Smart spot, stage 2 (relations). *Check:* sofa then coffee table (in front), bookshelf (against a wall), a sofa faces a TV stand, an L room.
- ⬜ K.2.15 Drag a library tile into the room: adds the default piece where it is dropped, inside the walls and clear of other pieces (nearest free spot to the drop point), selected, one undo step; a click still uses the smart spot; not in Walk. *Check:* drop in 2D and 3D, outside the room, on another piece, with the library collapsed.
- ⬜ K.2.16 Docs: CLAUDE.md Structure (`furniture.js`, `objects/` models, panel files), SPEC.md data model, backlog.

### K.3 Canvas navigation and help
Each task: implement only it, run `npm test`, `npm run lint`, `npm run build`, stop for review; commit after "good" and tick it here.

- ⬜ K.3.1 2D labels no longer clipped (`clampLabel`, `ClampedLabel`; a bug fix). *Check:* a 640 px pane, zoom in and pan so labels sit at every edge: none is cut.
- ⬜ K.3.2 Pose plumbing, no visible change: `cameraPoseStore`, `CameraPoseBridge`, the Walk mirror, `viewRequest`, `cameraViews.js` and tests. *Check:* tests; orbit and walk, the values update.
- ⬜ K.3.3 Shared hints and the view switch pill: `CanvasHint`, `HintButton`, `Keycap`, the config, the pill, the 3D pill and the 2D "?". *Check:* each hint fades after the first interaction and returns with "?"; 2D starts with only "?"; the pill is obvious in both themes; other switches look the same.
- ⬜ K.3.4 Walk hint strip and Esc: keycaps that light while held, replaces the old line. *Check:* each key lights while held; fades after the first move or look; "?" returns it; Esc leaves Walk and 3D keeps its view.
- ⬜ K.3.5 Walk mini-map, display only: card, rectangle and L outlines, windows, doors, furniture, the player and cone, collapse, opacity rules. *Check:* 50% normally, solid on hover and Tab focus; collapse survives a switch to 3D and back; never in 2D or 3D.
- ⬜ K.3.6 Mini-map clicks and pins: ghost circle, `landingPoint`, `moveWalkTo`, pins. *Check:* a click keeps the heading; outside the room or in the L's notch does nothing; a click 5 cm from a wall lands 0.25 m in; a pin outside is not drawn; a pin inside moves you.
- ⬜ K.3.7 Orbit limits and the camera tween (`CameraTween`, pitch 8 to 88, zoom limits, reduced motion). *Check:* cannot go under the floor or past the top; limits feel right in a 3 m and a 30 m room; a slot jump still works.
- ⬜ K.3.8 View cube and rotate buttons. *Check:* the cube follows a drag live and the wheel; each face lands exactly (0, 90, 180, 270; Top 88) and is highlighted; from Top a side goes to 28; the shortest way around the yaw; rotate snaps to multiples of 45 from any angle; labels fade edge-on; reduced motion snaps.
- ⬜ K.3.9 Docs: CLAUDE.md Structure (new files in `scene/`, `ui/`, `store/`), SPEC.md, backlog ("Fit room" and "Frame selection" buttons added as an idea).

### K.4 Architecture clean-ups (before angled walls)
- ⬜ K.4.1 Wall helpers in one place. *Check:* in Plan's 2D, drag a wall, cut one, place a door and a window, drag an opening onto another wall: 5 cm steps and distances as before. Commit: "Share wall direction and snap helpers".
- ⬜ K.4.2 One selection store. *Check:* select a sofa then a door in Plan (list and view): only one is selected; undo a delete of the selected piece; in Plan select a wall then an opening; switch modes and back; New Project clears the selection. Commit: "Move selection into one store".
- ⬜ K.4.3 One scene drag hook. *Check:* drag a piece, an opening in Plan (2D and 3D), an opening and a wall in Plan's 2D; each drag is one undo step; press Delete mid-drag and check Undo still works. Commit: "Share the scene drag handling".
- ⬜ K.4.4 One place for shortcuts. *Check:* every row of the shortcut table in Part J's spec, in Plan and Personalize, with the focus on the view, on a field and on a button. Commit: "Handle Plan shortcuts in one place".

### K.5 Angled walls
- ⬜ K.5.1 Model and file: any angle, the segment test, file version 3. *Check:* crossing, narrow slivers and old files in tests; an old file opens unchanged.
- ⬜ K.5.2 Editing in Plan's 2D view (after Julia answers how to make an angle).
- ⬜ K.5.3 Drawing the walls (mitered corners, shading, hiding, dimension lines).
- ⬜ K.5.4 Objects in an angled room (polygon clamp). *Check:* furniture stays inside, also turned.
- ⬜ K.5.5 Doors and windows on angled walls.
- ⬜ K.5.6 Walk and the Room render in an angled room. *Check:* Walk stops at the walls; the Room render and a Generate with a window still match.

### K.6 Wall thickness and snap to wall
- ⬜ K.6.1 Wall thickness, single and several walls.
- ⬜ K.6.2 Snap to wall.

### K.7 Controls redesign and scene toolbar
- ⬜ K.7.1 Style mock (v4), approved by Julia.
- ⬜ K.7.2 The remaining controls in the new look, both themes.
- ⬜ K.7.3 Scene toolbar.

### K.8 Walk look and feel
- ⬜ K.8.1 Julia's list of what is wrong in Walk, then its tasks (added when written).

## Acceptance criteria
### K.1 Room Configuration panel and the dark palette
- [ ] Three cards; Standard active on a new project; the right fields for each shape; Floor area correct for Standard and L.
- [ ] "4,5" and "4.5" both give 4.5; "abc", "0.5" and "31" in Width keep the old value and show a message.
- [ ] Width cannot go below the cut-out plus 0.5; a cut-out cannot exceed the room side minus 0.5.
- [ ] Each of the four corners puts the cut-out in the named corner, whatever the 3D camera angle.
- [ ] A size that would leave a door or window not fitting is refused with its name in the message.
- [ ] Reset room is one undo step and removes doors and windows.
- [ ] (changed 2026-11-21) Plan's panel has the Door and Window buttons again (K.1.13); Build is gone (K.1.17).
- [ ] Old files open; Custom turns the Cut tool on and off and is never highlighted; undo and redo work for every change here.
- [ ] No console errors; `npm run build`, `npm run lint` and `npm test` succeed; deployed and working.

### K.2 Furniture
- [ ] Each tile and "Your item" adds one default piece, selected, in its row, not on top of another; the heading count is right; the empty state shows with no pieces.
- [ ] Selecting in the list selects in 3D and the other way round; a hidden piece cannot be selected.
- [ ] Rename follows the rules; Escape and an empty name leave the old name; new names number per type.
- [ ] Hide and lock work, show their state at a glance, and are covered by undo; a locked piece does not move by drag, widget or arrow keys.
- [ ] Switching type follows the name, size, position, lock and hide rules; a changed size stays.
- [ ] Size fields accept comma or dot, refuse invalid input with a message, "Reset to default size" appears only after a change.
- [ ] Old files open with the same names, sizes and hidden pieces; the AI request sends type names, not custom names.
- [ ] Every icon-only button has an aria-label and a tooltip; contrast 4.5:1 for text and 3:1 for graphics in both themes.
- [ ] No console errors; `npm run build`, `npm run lint` and `npm test` succeed; deployed and working.

### K.3 Canvas navigation and help
- [ ] The Walk map is 50% opaque, solid on hover and on keyboard focus.
- [ ] A map click or pin click keeps the heading and never places the player outside the room, including the L's notch.
- [ ] The map is not in 2D or 3D.
- [ ] Clicking each cube face lands exactly on that view and highlights that face; dragging the canvas updates the cube live; the cube never holds its own angle.
- [ ] The rotate buttons snap to 45° steps.
- [ ] Hints fade after the first interaction and return through "?".
- [ ] No 2D dimension label is cut off at the smallest supported canvas.
- [ ] The "Frame" button works and looks as before.
- [ ] Reduced motion makes camera moves instant.
- [ ] No console errors; `npm run build`, `npm run lint` and `npm test` succeed; deployed and working.

### K.4 Architecture clean-ups (before angled walls)
- [ ] Nothing changed for the user: every behavior in K.4's checks is as before; `npm test`, `npm run lint` and `npm run build` pass after each task.

### K.5 Angled walls
- [ ] An old file opens unchanged; an angled room keeps furniture inside, doors and windows follow their wall, Walk stops at the walls, the Room render and a Generate with a window still match; a corner under the minimum angle and crossing walls are refused.

### K.6 Wall thickness and snap to wall
- [ ] A wall's thickness can be set for one or several walls; a piece near a wall snaps flush and follows an angled wall.

### K.7 Controls redesign and scene toolbar
- [ ] Every control and the toolbar in both themes in every state (hover, focus, disabled, selected), at 1280 px and wide.

### K.8 Walk look and feel
- [ ] To be written with K.8.1.

## Playwright ideas (scratch scripts, run by hand)
### K.1 Room Configuration panel and the dark palette
New project (three cards, Standard active, 5 / 5 / 2.6, area 25.0); "4,5" in Width with the link on (Depth 4.5, area 20.3); "abc" and "31" refused; ArrowUp and Shift+ArrowUp; each of the four corner buttons against the store's corners; Width below cut-out + 0.5 refused; undo and redo after size, shape and reset; Custom card toggles the Cut tool; a door that would not fit; Reset with a door and a sofa; Tab order and aria-labels; both themes; screenshots.

### K.2 Furniture
Empty room and the four tiles plus "Your item"; reload a saved file with 3 pieces (collapsed); rename (double-click, F2, pencil, Enter, Escape, blur, empty, 41 characters); select in 3D by clicking the canvas and check the row, and the other way round; hide (not clickable in 3D) and lock (drag does nothing); size fields ("1,5", "abc", "0", "11", ArrowUp, Shift+ArrowUp, Reset); type grid switching; undo and redo of add, remove, rename, type, size, hide, lock; Delete key not while a field is focused; both themes; tab order and labels.

### K.3 Canvas navigation and help
Computed `opacity` of the map card, `hover()` and `Tab` into a pin; `landingPoint` clicks inside, outside, in the notch, near a wall, reading `cameraPoseStore.walk.heading` before and after; the map's count in each view; click each cube face, wait 500 ms and read the orbit pose; drag the canvas and check the cube's transform; rotate twice and check a multiple of 45; each hint visible, interact, hidden, "?", visible; 1280 × 720 with the divider at 50% and every label inside the canvas; the "Frame" button still toggles the guide; `emulateMedia({ reducedMotion: 'reduce' })`.

## Risks
### K.2 Furniture
- Hide changes meaning (the faded look goes). Custom names must not reach the AI prompt. More types with a front change what the AI is told about facing: check a Generate. A type change must be one store update or it records several undo steps. File version changes once for this part. Rug and Wall art are 0.01 to 0.04 m thick: hard to click and prone to z-fighting (drawn 1 mm above the floor, with a larger click area). Large pieces in a small room can leave the smart spot with no free spot (falls back to the center).

### K.3 Canvas navigation and help
- Per-frame writes (the mirror while orbiting or walking): only the cube and the map re-render, and only when the value moved more than a threshold.
- The cube and map are HTML, so they never land in a Room render; any in-canvas helper carries `userData.helper`.
- The orbit limit changes how an existing camera slot looks when you jump to it.
- `moveWalkTo` rebuilds the camera rotation with `lookAt` from the stored direction: a tiny roll is possible; keep the full 3D direction and check it.
- Esc in Walk must not also act on Plan; it joins the other shortcuts when they are gathered into one place (K.4.4).

## Backlog
- Moved to [docs/BACKLOG.md](../BACKLOG.md).

## Open questions
### K.1 Room Configuration panel and the dark palette
- None blocking. Defaults taken 2026-11-21: Escape reverts a half-typed value; the L's default corner stays front right; drag-to-change is dropped on these fields.

### K.2 Furniture
- Julia to correct the catalog values marked * and every clearance, wall and role value.

### K.3 Canvas navigation and help
- None blocking. Defaults taken 2026-11-21: Esc leaves Walk for 3D; the Shift item stays in the strip.

### K.5 to K.8
- (K.5.2) How do I make an angle in Plan's 2D view: drag a corner anywhere (recommended), an angle field per wall, or both?
- (K.5.1) The minimum angle between two walls at a corner: 30° (recommended)?
- (K.6.1) Wall thickness range, default and step.
- (K.6.2) Snap to wall: always on, or only with a key held?
- (K.8.1) What is wrong in Walk today?

## Changelog
- 2026-11-21 (K.1): Julia: delete Build. Custom is never highlighted and only adds a Cut tool; Plan keeps the Cut tool, dragging walls, and in 2D the grid, the scale legend and the dimension lines; Door and Window come back in Plan's panel; the Cut tool works in 2D and 3D. Dropped: typing a wall's length. New tasks K.1.13 to K.1.17.
- 2026-11-21 (K.1): Draft written from Julia's brief and a code survey (Claude). Julia's answers: limits raised to 1 to 30 m and 2 to 6 m; Door and Window removed from Plan only; Reset room added; tooling follows CLAUDE.md; a size that would leave an opening not fitting is refused; the dark theme takes the new palette once (K.1.1).- 2026-11-21 (K.2): Draft written from Julia's brief and a code survey (Claude). Julia's answers: smart spot and drag from a tile; keep a changed size on a type change; grow from the center then push inside the walls; front arrow on the selected piece only; Hide = not drawn and not selectable; Object details keeps Color, Duplicate, Delete and the type's own settings, drops Location and Rotation; drag a library tile into the room yes, drag the selection box to resize no.
- 2026-11-21 (K.3): Draft written from Julia's brief and a code survey (Claude). Julia's answers: "Frame" is not renamed and "Fit room" and "Frame selection" are dropped for now; the dark theme palette is a K.1 task (K.1.1); map pins only for slots inside the room, bookmarks saved as before.
- 2026-11-21: One Part K. Julia expected all of it in Part K, so the three specs written as K, L and M (Room panel, Furniture, Canvas navigation) are merged here as blocks K.1 to K.3 and renumbered; the paused work comes in as K.4 Architecture clean-ups, K.5 Angled walls, K.6 Wall thickness and snap to wall, K.7 Controls redesign and scene toolbar, K.8 Walk look and feel.
