# Maketa: Product Spec

Source of truth for what Maketa is. Part specs in `docs/specs/` break this into buildable pieces.
If code and spec disagree, the spec wins (or the spec gets updated first).

## Product
A 3D room editor: set room dimensions, add objects, arrange them, and later render and restyle the view with AI.

## Roadmap
1. Room dimensions
2. Add objects (Sofa only for now)
3. Arrange objects: select from the list, move, rotate, recolor and delete via Object details (Part C); bigger start room, click-to-select and drag in 3D, move/rotate widget, tilt on all three axes, drag-to-change number values (Part D)
4. Plan and Personalize modes: a 16:9 frame guide in Plan; switching to Personalize captures a clean render from the Plan camera, shown next to an empty AI image slot (Part E)
5. AI restyle: upload one reference photo in Personalize, and Generate restyles the Room render to match it while keeping the room shape, camera and sofa placement (Part F)

## Layout
- Top bar (about 44 px) with a centered "Plan | Personalize" switch. Plan is the mode on page load.
- **Plan:** left control panel (20% by default, divider draggable 15–50%), right: 3D scene filling the rest, resizes with the window, with a centered 16:9 frame guide (toggle at its top right, visible by default).
- **Personalize:** same split layout, split top and bottom with a draggable divider (panel 15–50% of the height). Until dragged, the top part is exactly as tall as the images. Top: "Room render" and the "AI image" slot side by side, both 16:9, edge to edge, captions over the images. Bottom: control panel.

## Control panel: collapsible sections
1. **Room configuration** (open by default)
2. **Objects** (open by default)
3. **Object details** (visible only when an object is selected)

## Data model (Zustand, `src/store/`)
All units in meters.

```js
room: { width, depth, height }
objects: [{ id, type, number, position: [x, y, z], rotation: [x, y, z], size: { width, depth, height }, color }]
// number: stable per-type count (Sofa 1, Sofa 2, ...), never reused
// position: y is always 0 (on the floor); a tilted object is lifted by the renderer so its lowest point touches the floor
// rotation: radians, Euler order 'YXZ': y turns the object on the floor, x and z tilt it
selectedId: string | null
mode: 'plan' | 'personalize'
snapshot: string | null                     // PNG data URL of the last Room render, memory only
planView: { position: [x, y, z], target: [x, y, z] }  // Plan orbit camera, restored when Plan mounts again

// AI restyle (restyleStore), memory only: kept across mode switches, lost on reload
photo: { dataUrl, name } | null             // reference photo, resized on upload
photoError: string | null
status: 'idle' | 'loading'
error: string | null
result: string | null                       // AI image data URL
resultSnapshot: string | null               // the Room render the result was made from
remaining: number | null                    // generations this visitor can still make today, from the server
limit: 'total' | 'visitor' | null           // which limit was reached when remaining is 0
```

Daily limit counts live on the server (Upstash Redis), not in the stores.

Objects are always a list, even with one type.

## Part specs
| Part | File | Scope | Status |
|---|---|---|---|
| A | specs/part-a-room.md | Layout, collapsible panel, room configuration | Done |
| B | specs/part-b-objects.md | Objects section, add Sofa | Done |
| C | specs/part-c-details.md | Select from list, Object details (position, rotation, color), delete | Done |
| D | specs/part-d-arrange.md | Bigger room, click-to-select in 3D, drag, move/rotate widget, tilt, drag-to-change values | Done |
| E | specs/part-e-personalize.md | Plan/Personalize modes, frame guide, snapshot, Personalize layout | Done |
| F | specs/part-f-restyle.md | Reference photo, Generate/Regenerate via serverless AI, daily limits | Done |

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
