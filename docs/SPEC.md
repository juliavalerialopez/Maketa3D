# Maketa: Product Spec

Source of truth for what Maketa is. Part specs in `docs/specs/` break this into buildable pieces.
If code and spec disagree, the spec wins (or the spec gets updated first).

## Product
A 3D room editor: set room dimensions, add objects, arrange them, and later render and restyle the view with AI.

## Roadmap
1. Room dimensions
2. Add objects (Sofa only for now)
3. Arrange objects (select, move, rotate, delete)
4. Camera capture (render image from a camera view)
5. AI restyle (style prompt turns the capture into a photorealistic image)

## Layout
- Left control panel: 20% of screen width.
- Right: 3D scene, remaining 80%, full height, resizes with the window.

## Control panel: collapsible sections
1. **Room configuration** (open by default)
2. **Objects** (open by default)
3. **Object details** (visible only when an object is selected)

## Data model (Zustand, `src/store/`)
All units in meters.

```js
room: { width, depth, height }
objects: [{ id, type, position: [x, y, z], rotation, size: { width, depth, height }, color }]
selectedId: string | null
```

Objects are always a list, even with one type.

## Part specs
| Part | File | Scope | Status |
|---|---|---|---|
| A | specs/part-a-room.md | Layout, collapsible panel, room configuration | In progress |
| B | specs/part-b-objects.md | Objects section, add Sofa | Not started |
| C | specs/part-c-details.md | Selection, Object details section | Not started |

## Rules
- Every day ends with a working deploy on Vercel (branch `master`).
- Assets in `/public` are referenced as URL strings, never imported.
- No UI libraries. Plain CSS.
