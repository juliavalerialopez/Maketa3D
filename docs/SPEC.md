# Maketa: Product Spec

Source of truth for what Maketa is. Part specs in `docs/specs/` break this into buildable pieces.
If code and spec disagree, the spec wins (or the spec gets updated first).

## Product
A 3D room editor: set room dimensions, add objects, arrange them, and later render and restyle the view with AI.

## Roadmap
1. Room dimensions
2. Add objects (Sofa in Part B; five more types in Part G)
3. Arrange objects: select from the list, move, rotate, recolor and delete via Object details (Part C); bigger start room, click-to-select and drag in 3D, move/rotate widget, tilt on all three axes, drag-to-change number values (Part D)
4. Plan and Personalize modes: a 16:9 frame guide in Plan; switching to Personalize captures a clean render from the Plan camera, shown next to an empty AI image slot (Part E)
5. AI restyle: upload one reference photo in Personalize, and Generate restyles the Room render to match it while keeping the room shape, camera and sofa placement (Part F)
6. Soft UI restyle (light and dark theme), five new objects (coffee table, armchair, TV stand with TV, bookshelf, floor lamp), a Project menu to start, open and save the layout as a JSON file (Part G)
7. AI versions and references: up to 6 generated versions with thumbnails and download, a Reference | Creative card per object and for the room, limits from environment variables (Part H)
8. Code health and backlog: bug fixes, tests and lint, an error screen, drag and drop upload, undo and redo, a fixed 1920 × 1080 Room render, three camera slots with a Camera menu in Personalize, Save into the opened project file with its name in the top bar, a wall-shades prompt test (not kept), and prompt fixes so that only the room photo sets the walls and floor and each piece faces as in the Room render (prompt v9) (Part I)

## Layout
- Top bar (52 px): the Maketa logo on the left, a centered "Plan | Personalize" switch, the light/dark theme switch on the right. Plan is the mode on page load.
- Clicking the logo opens the **Project** menu: New Project (asks first, then resets room, objects, Plan camera and camera slots, and clears the undo history and the project's file), Open Project, Save, Save As. New and Open are disabled in Personalize. Save writes into the opened or last saved file without asking; Save As, and a new project's first Save, ask for the name and folder in the system window (I.17, Chrome and Edge). Other browsers download: Save under the project's name, Save As after asking for a file name in a dialog. The project name shows right of the logo, "New Project" until saved.
- If the 3D scene or a mode fails (an error, or the WebGL context is lost), an error screen replaces it with a short message, Save layout and Reload (Part I, I.3).
- Theme: Moss System soft UI, light and dark. Follows the system setting until switched by hand; the manual choice is saved in `localStorage`. The scene's floor and walls and the Room render look the same in both themes.
- **Plan:** left control panel (20% by default, divider draggable 15–50%), right: 3D scene filling the rest, resizes with the window, with a centered 16:9 frame guide (toggle at its top right, visible by default). Undo and Redo at its top left (Part I, I.11). Three camera slots along its bottom (I.14.1): an empty slot shows a big plus and saves the current view when clicked; a filled one shows its thumbnail, moves the Plan view to it when clicked, and has an update icon (top left) and an X (top right, on hover or focus).
- **Personalize:** same split layout, split top and bottom with a draggable divider (panel 15–50% of the height). Until dragged, the top part is exactly as tall as the images. Top: "Room render" and the "AI image" slot side by side, both 16:9, edge to edge, captions over the images. A Camera menu at the top left of the Room render chooses which camera slot's render is shown and used (I.14.2). Bottom: control panel.

## Control panel: collapsible sections
1. **Room configuration** (open by default)
2. **Objects** (open by default)
3. **Object details** (visible only when an object is selected)

## Data model (Zustand, `src/store/`)
All units in meters.

```js
room: { width, depth, height }
objects: [{ id, type, number, position: [x, y, z], rotation: [x, y, z], size: { width, depth, height }, color, screenInches?, hidden? }]
// type: 'sofa' | 'coffeeTable' | 'armchair' | 'bookshelf' | 'floorLamp' | 'tvStand' (defined in objects/catalog.js)
// number: stable per-type count (Sofa 1, Sofa 2, ...), never reused
// screenInches: TV stand only, whole inches 32-85 (default 55); its size is computed from it
// hidden: true only when the Hide switch is on (Part H, H.6.2): not in the Room render, no reference card, faded in Plan
// position: y is always 0 (on the floor); a tilted object is lifted by the renderer so its lowest point touches the floor
// rotation: radians, Euler order 'YXZ': y turns the object on the floor, x and z tilt it
lastNumbers: { [type]: number }             // highest number handed out per type
selectedId: string | null
mode: 'plan' | 'personalize'
roomRenders: [{ image, objects, view } | null]  // one Room render per camera slot (empty until the first switch), taken on switching to Personalize, memory only (I.12, I.14.2):
//   image: PNG data URL
//   objects: [{ id, x, y, facing }], each object's centre in the render, percent, and which way its front faces there (one of eight, null without a front, I.19) (sent to the AI)
//   view: { projection, view, width, height }, the camera that took it (in-frame checks)
renderSlot: number | null                   // the camera chosen in Personalize; its render is shown, carded and sent
planView: { position: [x, y, z], target: [x, y, z] }  // Plan orbit camera, restored when Plan mounts again
slots: [{ view: { position, target, fov }, thumbnail } | null] × 3  // cameraSlotsStore (I.14.1): saved 16:9 frame cameras, fov in degrees; thumbnail is null until drawn after Open (I.14.3)
activeSlot: number | null                   // the slot last saved, updated or jumped to
past, future: [{ room, objects }]           // historyStore (I.11), memory only: undo steps (oldest first, at most 50) and redo steps; cleared by New and Open Project
theme: 'light' | 'dark'                     // uiStore; manual choice saved in localStorage
name: string | null, handle: FileSystemFileHandle | null  // projectStore (I.17), memory only: the project's file name without .json ("New Project" when null) and the file Save writes into

// AI restyle (restyleStore), memory only: kept across mode switches, lost on reload
references: { [objectId | 'room']: { mode: 'reference' | 'creative', photo: { dataUrl, name } | null, photoError } }
notice: string | null                       // after Generate switched objects to Creative for the 8-photo limit
status: 'idle' | 'loading'
error: string | null
versions: [{ id, number, image, roomRender, slot, createdAt }]  // at most 6, oldest first; image and roomRender are data URLs; slot: the camera it was made from (I.14.2)
selectedVersionId: string | null            // the version shown in the AI image
lastVersionNumber: number                   // version numbers count up per session (download names)
remaining: number | null                    // generations this visitor can still make today, from the server
limit: 'total' | 'visitor' | null           // which limit was reached when remaining is 0
visitorLimit, totalLimit: number | null     // the current daily limits, from the server
```

Daily limit counts live on the server (Upstash Redis), not in the stores.

Objects are always a list, even with one type.

## Project file
Save writes the layout as JSON into the project's file (the one opened or last saved, I.17), or downloads it (`maketa-layout.json`, or the project's name) where the browser has no file access; Open reads it back. Full rules and checks: Part G spec, "Export and import".

```json
{
  "version": 1,
  "room": { "width": 4.0, "depth": 3.5, "height": 2.6 },
  "objects": [
    { "type": "tvStand", "number": 1, "x": 2.0, "z": 0.3, "rotation": 0, "color": "#d9d2bf", "screenInches": 55 }
  ],
  "cameras": [
    { "x": 4, "y": 4, "z": 4, "targetX": 0, "targetY": 0, "targetZ": 0, "fov": 50 },
    null,
    null
  ]
}
```

- `rotation` is the Y rotation in whole degrees (0–359); tilt and size are not saved.
- `"hidden": true` is saved only for hidden objects. Files without it import with every object shown.
- `cameras` (I.14.3): one entry per camera slot, `null` (empty) or the slot's camera in meters and its field of view in degrees. Thumbnails are not saved; the Plan scene draws them again after Open. Files without it (including those with the I.14 `camera` field) open with all slots empty and none active. When present, it must have exactly 3 entries, each `null` or seven numbers with a field of view above 0 and below 180 and a target away from the camera; otherwise the file is invalid.
- Open replaces the room, objects and camera slots, clamps positions inside the walls, clears the selection and continues numbering after the highest number per type. An invalid file shows a short message and changes nothing.

## Part specs
| Part | File | Scope | Status |
|---|---|---|---|
| A | specs/part-a-room.md | Layout, collapsible panel, room configuration | Done |
| B | specs/part-b-objects.md | Objects section, add Sofa | Done |
| C | specs/part-c-details.md | Select from list, Object details (position, rotation, color), delete | Done |
| D | specs/part-d-arrange.md | Bigger room, click-to-select in 3D, drag, move/rotate widget, tilt, drag-to-change values | Done |
| E | specs/part-e-personalize.md | Plan/Personalize modes, frame guide, snapshot, Personalize layout | Done |
| F | specs/part-f-restyle.md | Reference photo, Generate/Regenerate via serverless AI, daily limits | Done |
| G | specs/part-g-style-objects-layout.md | Soft UI and dark theme, five new objects, Project menu (new, open, save) | Done |
| H | specs/part-h-references-versions.md | Version history, download, a reference image per object and for the room, Hide switch, limits from env vars | Done |
| I | specs/part-i-code-health.md | Bug fixes, code health and tests; drag and drop upload, undo, fixed 1920 × 1080 render, camera slots, save into the opened file, wall-shade test, prompt v9 (room photo sets the walls, pieces keep their facing) | Done |

## How we work
- Each part is a sprint with **Goal**, **Tasks**, **Backlog** and **Changelog**.
- Tasks are numbered `<Part>.<n>.<m>` (e.g. A.4.3) so they can be referenced directly.
- A deviation (something we do that wasn't planned) becomes a new numbered task tagged `(added YYYY-MM-DD)`. Existing numbers are never renumbered.
- When a goal changes, add a dated line to that part's Changelog.
- A part is done when its acceptance criteria pass and it is deployed. The next part's goals are confirmed before it starts.
- Ideas outside the current part go to that part's Backlog and are reviewed at the start of the next part.

## Rules
- Every day ends with a working deploy on Vercel (branch `master`).
- Assets in `/public` are referenced as URL strings, never imported.
- No UI libraries. Plain CSS.
