# Part B: Add Objects

Status: **In progress**.

## Goal
The user adds a Sofa from the Objects section, and it appears on the room floor.

## Requirements

### Store
- `src/store/objectsStore.js`: `objects: []` and `addObject(type)`, following the data model in SPEC.md
  (`{ id, type, position: [x, y, z], rotation, size: { width, depth, height }, color }`).
- `id` from `crypto.randomUUID()`. `rotation` is the Y-axis angle in radians, default 0.

### Objects section
- An "Add Sofa" button.
- A list of added objects, labelled by type and number: "Sofa 1", "Sofa 2", ...

### Sofa
- Rendered as primitives (no .glb): a seat, a backrest and two arms grouped together.
  The outer bounds match `size`.
- Default size: width 2.0, depth 0.9, height 0.8 m. Default color: `#b5654a` (warm terracotta).
- Sits on the floor (y = 0).

### Placement
- The first sofa goes at the room centre.
- Each next sofa is offset 0.3 m diagonally from the previous one, so sofas don't fully overlap.
- A new sofa is always placed fully inside the room's current walls.

## Tasks
- ✅ B.1 Objects store (`objects`, `addObject`)
- ✅ B.2 "Add Sofa" button in the Objects section
- ✅ B.3 Sofa primitive (seat, back, arms), rendered from the store, on the floor
- ⬜ B.4 Placement: centre first, then 0.3 m diagonal offset, kept inside the room
- ⬜ B.5 List of added objects in the Objects section
- ⬜ B.6 Build passes and deploy

## Out of scope
Selecting, moving, rotating, deleting objects (Part C). Real .glb models.

## Acceptance criteria
- [ ] Clicking "Add Sofa" twice adds 2 sofas, both on the floor, inside the room, and visibly not on top of each other.
- [ ] Each sofa reads as a sofa (seat, back, arms) in terracotta.
- [ ] Both sofas appear in the Objects list as "Sofa 1" and "Sofa 2".
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- Keep objects inside the room when the room shrinks.
- .glb sofa model instead of a primitive.
- Redesign the panel UI: room inputs (carried over from Part A backlog) together with the Objects section.

## Open questions
- None blocking.

## Changelog
- 2026-10-08: Draft created.
- 2026-10-16: Goals confirmed. Decided placement (centre, then 0.3 m diagonal offset), sofa shape (seat + back + arms), color `#b5654a`. Split placement into its own task (B.4); list moved to B.5, deploy to B.6. Panel redesign kept in backlog.
