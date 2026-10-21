# Maketa

3D room configurator web app, built as a 5-part prototype:
1. Room dimensions
2. Place primitive objects
3. Rearrange them
4. Camera render
5. AI restyle

## Stack (fixed, do not substitute)
- Vite + React, JavaScript (not TypeScript)
- React Three Fiber, Three.js, Drei
- Zustand for state
- npm, run with `npm run dev`

React is pinned to `19.2.8` (not a caret range) because `@react-three/fiber@9.7.0`
peer-depends on `react >=19 <19.3`. When bumping React, re-check that peer range
first.

## Structure
- `src/components/`, grouped by role:
  - `layout/`: page layout (split panel / scene)
  - `panel/`: HTML in the left control panel (sections, inputs, lists)
  - `scene/`: R3F room and rendering (floor, walls, objects renderer)
  - `objects/`: one 3D model component per placeable type, plus `catalog.js`
  - `ui/`: shared panel controls (`NumberField`, `ColorField`, `Button`,
    `ListItem`). Every number input, color input, action button and list row
    in the panel uses these; change their look or behavior only here.
- `src/components/objects/catalog.js`: the single definition of each object type
  (label, component, default size, color). Adding a type = a model file in
  `objects/` + one catalog entry; do not define types anywhere else.
- `src/store/`: Zustand stores
- `public/models/`: static assets (`.glb`, etc.), referenced as URL strings
  (e.g. `"/models/x.glb"`), **never** as ES imports
- `docs/SPEC.md`: product spec (source of truth)
- `docs/specs/part-*.md`: part specs with numbered tasks, backlog, changelog

## Specs
- Read `docs/SPEC.md` and the current part spec before planning.
- If code and spec disagree, the spec wins (or update the spec first).
- Deviations become new numbered tasks tagged `(added YYYY-MM-DD)`. Never renumber.
- If something is unclear, ask before coding.

## Constraints
- No extra libraries, UI frameworks, or routing beyond the stack above.
- No UI libraries. Plain CSS.
- Assets in `/public` are referenced as URL strings, never imported.

## Deploy rule
Every day must end with a working deploy. Before stopping work, run
`npm run build` and confirm it succeeds, then remind me to push.
Never push yourself.

- Only commit after my "good" (see Checkpoints).
- One commit per coherent step (e.g. "Add room store", "Wire width input to store", "Hide camera-facing walls").
- Each commit must leave the app in a working state: `npm run build` passes.
- Use short imperative messages: "Add room store", not "added stuff".
- Do not mix unrelated changes in one commit.

## Checkpoints
Work one task at a time, with a review stop before each commit:
1. Implement only the current task.
2. Run `npm run build`.
3. Do **not** commit. Stop and report what changed and what to check in `npm run dev`.
4. Wait for my reply:
   - "good": commit with the planned message and tick the task in the part spec
     (e.g. `docs/specs/part-a-room.md`) in the same commit. Do not push.
   - "change: ...": apply the change, rebuild, and stop again for review.
5. I push myself. Start the next task only when I say "next".