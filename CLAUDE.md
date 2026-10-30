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

Exception (added 2026-10-28, Part F): the AI restyle needs a server, so the
app also has Vercel serverless functions in `api/` (Node, no npm packages:
`fetch` and `node:crypto` only) and Upstash Redis for the daily limits, called
over its REST API with `fetch`. No other server code or services.

React is pinned to `19.2.8` (not a caret range) because `@react-three/fiber@9.7.0`
peer-depends on `react >=19 <19.3`. When bumping React, re-check that peer range
first.

## Structure
- `src/components/`, grouped by role:
  - `modes/`: one component per top-level mode (`PlanMode`,
    `PersonalizeMode`). `App.jsx` renders only the top bar and exactly one
    mode. Modes hold no state: everything that must survive a mode switch
    (room, objects, selection, mode, camera, snapshot, divider positions,
    open sections, frame toggle) lives in `src/store/`.
  - `layout/`: page layout (top bar, `SplitLayout` with a draggable divider,
    side by side in Plan, stacked top and bottom in Personalize)
  - `panel/`: HTML in the control panels (Plan and Personalize), built from
    `Section` and `ui/`
  - `scene/`: R3F room and rendering (floor, walls, objects renderer), the
    frame guide, Plan camera restore and the snapshot. Scene helpers
    (selection box, future grids) set `userData.helper` so the snapshot
    hides them.
  - `objects/`: one 3D model component per placeable type, plus `catalog.js`
  - `ui/`: shared panel controls (`NumberField`, `ColorField`, `Button`,
    `ListItem`, `FieldGroup`, `SegmentedSwitch`). Every number input, color input, action button and list row
    in the panel uses these; change their look or behavior only here.
- `src/components/objects/catalog.js`: the single definition of each object type
  (label, component, default size, color). Adding a type = a model file in
  `objects/` + one catalog entry; do not define types anywhere else.
- `src/store/`: Zustand stores
- `src/services/`: browser code that talks to the server or prepares data for
  it (e.g. `restyle.js`: image resizing, `/api/restyle` requests, error
  messages). Requests go through stores; components may import constants
  and message helpers only.
- `api/`: Vercel functions. Files starting with `_` are helpers, not routes
  (`_gemini.js`, `_limits.js`, `_restyle-prompt.js`). API keys and secrets
  exist only here, as env vars, never in `src/`.
- `scripts/`: Node scripts run by hand (e.g. `try-restyle.mjs`, the prompt
  test), not part of the app build
- `public/models/`: static assets (`.glb`, etc.), referenced as URL strings
  (e.g. `"/models/x.glb"`), **never** as ES imports
- `docs/SPEC.md`: product spec (source of truth)
- `docs/specs/part-*.md`: part specs with numbered tasks, backlog, changelog
- `docs/prompts/`: AI prompts, one file each, with numbered versions and test
  results. The live copy in `api/` must match the latest version.
- `docs/decisions/`: decision records (`NNNN-title.md`), e.g. the model choice

## Running locally
- `npm run dev`: the app only; `/api` does not run.
- `npx vercel dev`: the app and `/api` together. Once: `npx vercel link` and
  `npx vercel env pull .env.local` (gitignored). The Vercel CLI is not added to
  `package.json`.
- `RESTYLE_MOCK=1` in `.env.local` makes `/api/restyle` return the render
  after 2 s, with no AI call and no counting. Never set it in production.

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