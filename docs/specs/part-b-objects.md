# Part B: Add Objects (draft)

Status: **Draft**. Review the goal and open questions before starting.

## Goal
The user adds a Sofa from the Objects section, and it appears on the room floor.

## Requirements
- Objects store: `objects: []` and `addObject(type)`, following the data model in SPEC.md
  (`{ id, type, position: [x, y, z], rotation, size: { width, depth, height }, color }`).
- The Objects section has an "Add Sofa" button.
- A sofa is rendered as a primitive (box-based, no .glb), sits on the floor (y = 0), and is placed inside the room.
- The Objects section lists the added objects.

## Tasks
- ⬜ B.1 Objects store (`objects`, `addObject`)
- ⬜ B.2 "Add Sofa" button in the Objects section
- ⬜ B.3 Sofa primitive: default size ~2.0 × 0.9 × 0.8 m, placed at room centre, on the floor
- ⬜ B.4 List of added objects in the Objects section
- ⬜ B.5 Build passes and deploy

## Out of scope
Selecting, moving, rotating, deleting objects (Part C). Real .glb models.

## Acceptance criteria
- [ ] Clicking "Add Sofa" twice adds 2 sofas, both on the floor and inside the room.
- [ ] Both sofas appear in the Objects list.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- Keep objects inside the room when the room shrinks.
- .glb sofa model instead of a primitive.

## Open questions
- Where does a new sofa go: always the centre, or offset each time so they don't overlap?
- Default sofa size and color?

## Changelog
- 2026-10-08: Draft created.
