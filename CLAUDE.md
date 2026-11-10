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
`fetch` and `node:crypto` only, plus local imports of `api/_*.js` and
`shared/`) and Upstash Redis for the daily limits, called over its REST API
with `fetch`. No other server code or services.

React is pinned to `19.2.8` (not a caret range) because `@react-three/fiber@9.7.0`
peer-depends on `react >=19 <19.3`. When bumping React, re-check that peer range
first.

## Structure
- `src/components/`, grouped by role:
  - `modes/`: one component per top-level mode (`PlanMode`,
    `PersonalizeMode`). `App.jsx` renders only the top bar and exactly one
    mode. Modes hold no state: everything that must survive a mode switch
    (room, objects, selection, mode, Plan camera, camera slots, Room
    renders, undo history, divider positions, open sections, frame toggle)
    lives in `src/store/`.
  - `layout/`: page layout (top bar with the logo's Project menu
    (`ProjectMenu`: new, open, save, save as, and the project name),
    Generate and the theme switch, `SplitLayout` with a draggable divider,
    side by side in Plan, stacked top and bottom in Personalize), plus
    `ErrorBoundary` and its `ErrorScreen` (Save layout, Reload) and
    `useFileDropGuard` (a file dropped outside the cards is not opened by
    the browser)
  - `panel/`: HTML in the control panels (Plan and Personalize), built from
    `Section` and `ui/`
  - `scene/`: R3F room and rendering (floor, walls, objects renderer), the
    frame guide, the camera slots (`CameraSlots`), Undo and Redo
    (`HistoryButtons`), Plan camera restore, `ContextLossGuard` and the
    snapshot (`SnapshotBridge` and `snapshot.js`: the Room render and the
    slot thumbnails; `roomRenderView.js` prepares the scene for them,
    `wallVisibility.js` hides the walls facing a camera, `themeColor.js`
    reads theme colors for the scene). Scene helpers (selection box, future
    grids) set `userData.helper` so the snapshot hides them. `Walls.jsx` has
    a dev-only `?wallShades` switch for the I.15 prompt test.
  - `objects/`: one 3D model component per placeable type, plus `catalog.js`
    and `models.js`. Models are built from primitives with `Parts.jsx`, origin in the middle
    of the base, filling their size box.
  - `ui/`: shared controls (`NumberField`, `ColorField`, `Button`,
    `IconButton`, `ListItem`, `FieldGroup`, `SegmentedSwitch`, `Toggle`,
    `MenuButton`, `Dialog`, `Thumbnail`). Every number input, color input,
    action button, icon button, list row, menu, dialog and thumbnail uses
    these; change their look or behavior only here.
- `src/components/objects/catalog.js`: the single definition of each object type
  (label, default size, color), plain data with no React, so stores and tests
  can import it. `models.js` maps each type to its model component; only
  `scene/Objects.jsx` imports it. Adding a type = a model file in
  `objects/`, one catalog entry and one line in `models.js`; do not define
  types anywhere else. The Objects section shows one button per entry. A type with a screen size (TV
  stand) also has `screenInches` limits and `sizeFor`; its formula lives in
  `tvStandSize.js`.
- `src/store/`: Zustand stores (room, objects, mode, ui, restyle,
  `historyStore` for undo and redo, `cameraSlotsStore`, `projectStore` for
  the project's file and name), plus plain helpers: `roomBounds.js` (wall
  clamping, rotated footprint, angle helpers) and `layoutFile.js` (project
  file: save, open, validate, new project).
- `src/index.css`: all styles. Colors are CSS variables per theme on
  `:root[data-theme="light"]` and `:root[data-theme="dark"]`; components use
  the role variables (`--accent`, `--on-accent`, `--soft`, ...), never a
  palette color by name.
- `src/services/`: browser code that talks to the server or prepares data for
  it (e.g. `restyle.js`: image resizing, `/api/restyle` requests, error
  messages; `frame.js`: the 1920 × 1080 Room render size, the frame camera
  and the projection onto it, and whether an object shows in the Room
  render, using the camera stored with it; `zip.js`: the ZIP of all AI
  versions; `download.js`: saving files and data URL helpers;
  `projectFile.js`: the browser's Open and Save as windows for the project
  file). Requests go through stores; components may import constants and
  message helpers only. Exception: the scene's render code
  (`scene/SnapshotBridge.jsx`) uses the `frame.js` camera math directly.
- `shared/`: plain JS with no imports, used by both the browser and `api/`
  (`restyle.js`: photo, object and body limits), so each limit is defined
  once.
- `api/`: Vercel functions. Files starting with `_` are helpers, not routes
  (`_gemini.js`, `_limits.js`, `_restyle-prompt.js`). API keys and secrets
  exist only here, as env vars, never in `src/`.
- `tests/`: `node:test` tests of the plain logic (stores, helpers, `api/`),
  run with `npm test`. Files they import use full `.js` extensions.
- `scripts/`: Node scripts run by hand (e.g. `try-restyle.mjs`, the prompt
  test: it sends a request saved from the app, or a test case with image
  paths, to Gemini with the live prompt), not part of the app build
- `public/models/`: static assets (`.glb`, etc.), referenced as URL strings
  (e.g. `"/models/x.glb"`), **never** as ES imports
- `docs/SPEC.md`: product spec (source of truth)
- `docs/specs/part-*.md`: part specs with numbered tasks, backlog, changelog
- `docs/prompts/`: AI prompts, one file each, with numbered versions and test
  results. The live copy in `api/` must match the latest version.
- `docs/decisions/`: decision records (`NNNN-title.md`), e.g. the model choice
- `docs/design/`: style mocks (HTML), e.g. `maketa-style-v3.html` for Part G

## Running locally
- `npm run dev`: the app only; `/api` does not run.
- `npx vercel dev`: the app and `/api` together. Once: `npx vercel link` and
  `npx vercel env pull .env.local` (gitignored). The Vercel CLI is not added to
  `package.json`.
- `RESTYLE_MOCK=1` in `.env.local` makes `/api/restyle` return the render
  after 2 s, with no AI call and no counting. Never set it in production.
- `RESTYLE_VISITOR_LIMIT` and `RESTYLE_TOTAL_LIMIT` raise the daily limits
  (defaults 3 per visitor, 20 in total) for local testing only. Never set
  them in Vercel production.

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

## Subagents (ask me which to run)
Project subagents live in `.claude/agents/`: `verifier` (build and lint,
failures only), `spec-reviewer` (changes vs spec and these rules), `researcher`
(open technical questions, only when I ask), `portfolio-updater` (after a Part is
Done and pushed: writes the portfolio draft and screenshots into `docs/portfolio/`).
- After finishing a task and running `npm run build`, ask me which subagent to
  run before the review stop: verifier, spec-reviewer, both, or none. Wait for
  my answer. Never run a subagent I did not choose.
- Recommend one in the question, with a short reason (for example: "touches the
  store and two panels, so I suggest both").
- Report what the subagents found, then stop for my review as usual.

## Batch mode (only when I ask)
When I say "do tasks X.1 to X.4 and commit each", the review stop is skipped.
Ask me once, before starting, which subagents to run on every task in the batch.
For each task, in order:
1. Implement only that task.
2. Run the chosen subagents. Fix build or lint failures and "Missing" or "Rule
   breaks" findings. Undo "Scope creep", do not add to it.
3. Commit with the planned message and tick the task in the part spec, in the
   same commit.
4. Go to the next task.
Stop and report instead of continuing if: a check still fails after two fix
attempts, the spec is unclear, or a task needs a change outside its scope.
Never push. At the end, list each commit and what to check in `npm run dev`.

## Running commands
Run commands one at a time and plain: `npm test`, `npm run build`, `git diff --stat`.
No pipes, no `&&` or `;` chains, no output redirection, no `git -C` or `cd`
(you are already in the project folder). Plain commands match the
allowed list in `.claude/settings.local.json` and do not ask me for approval.
Never edit source files with `sed -i` to test something, and never run
`git checkout --` on a file with uncommitted changes. Ask me first.

## Commit messages
Keep them simple: one short imperative line. Never add "Co-Authored-By", a
session link, "Generated with", or any other trailer or attribution line.

## Portfolio update
When a Part's spec Status becomes Done and I have pushed, ask me whether to run
`portfolio-updater`. It writes a draft in `docs/portfolio/` and takes screenshots
with `scripts/portfolio-shots.mjs` (Playwright installed with `--no-save`, never
added to package.json). I paste the draft into Framer myself. It never edits
Framer and never commits; I review and commit its files like any other task.
