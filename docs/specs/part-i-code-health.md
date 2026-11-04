# Part I: Code health and backlog

Status: **In progress**. Builds on Part H (versions, a reference per object, Hide switch).

## Goal
1. Fix the known bugs and risks: objects left outside a smaller room, downloads that can fail, a crash that blanks the page, and a limit counter that can briefly refuse an allowed request.
2. Make the code easier to change and to test: stores without React components, one place for numbers the browser and the server share, one place for the Room render data, and tests with Node's built-in test runner.
3. Five items from earlier backlogs: drag and drop upload, undo, a fixed 1920 × 1080 Room render, a placeable camera, and a wall-shade test for rooms with several pieces.

## Decisions
- No new libraries. Tests use Node's built-in `node:test`; the error boundary and the undo history are written by hand.
- Tests live in `tests/`, never in `api/` (every file in `api/` without a leading `_` becomes a route).
- Plain-logic files (stores, services, the object catalog, `api/` helpers) import with full file extensions (`./roomStore.js`), so Node can load them in tests. Vite accepts both.
- I.4 to I.8 and I.12 change no behavior. Every other task says what changes.
- Undo and redo are one step per gesture (a whole drag, not every pointer move).
- The Room render becomes a fixed 1920 × 1080 image (I.13) before the placeable camera (I.14) is built on it.
- "Save the Module" and doors and windows move to Part J.

## Out of scope
- Multi-select, snap to wall, the scene toolbar from the mock.
- Saving the layout in the browser (autosave).
- Another image model (only if the I.15 wall-shade test fails, and with a decision record).
- Splitting the bundle, keeping AI images as Blobs.
- Saving a camera view with its styles, doors and windows (Part J).

## Requirements

### I.1 Objects stay inside a smaller room
- `ui/NumberField` gets an optional `onCommit(value)`. It is called once with the limited value when a value is committed: on blur, with the minus and plus buttons, with Up and Down, and when a drag ends. Typing still sends `onChange` with each valid number, as today.
- Room width, depth and height: on commit, every object is clamped inside the walls with `clampPosition` (rotated footprint, as for rotation and screen size). An object that no longer fits on one axis is centered on that axis.
- While typing, objects do not move. Typing "10" first sends "1", which must not push every object to the middle.
- The clamp lives in `objectsStore` (`fitToRoom(room)`), so it can be reused (undo, I.11).

### I.2 One download helper
- New `services/download.js`: save a URL or a Blob under a file name. An object URL is revoked a few seconds after the click, not right away, so Safari and Firefox finish the download.
- "Download this image", "Download all as ZIP" (`PersonalizeMode.jsx`) and Save / Save As (`exportLayout`) use it. The ZIP code (`downloadAll`, `versionFileName`) moves out of the mode component into `services/download.js`.
- One helper reads a data URL's type and bytes. It is used by the ZIP and by the restyle request.

### I.3 Error screen instead of a blank page
- An error boundary around the Plan canvas and one around the whole mode area. When a component throws, or the WebGL context is lost, the area shows a short message, a **Save layout** button (`exportLayout`) and a **Reload** button. The message is "The 3D view stopped working." for the Plan canvas, and "This part of Maketa stopped working." for the mode area.
- The top bar and the Project menu keep working. Switching modes starts the mode area fresh, so the other mode can still be used.

### I.4 Object catalog without React
- `objects/catalog.js` keeps only data: label, size, color, `screenInches`, `sizeFor`. It is still the single definition of each type.
- New `objects/models.js`: type → model component. Only `scene/Objects.jsx` imports it.
- Adding a type = a model file, one catalog entry and one line in `models.js`. Update the catalog rule in `CLAUDE.md` in the same commit.

### I.5 Tests
- `npm test` runs `node --test` on `tests/*.test.js`. No library. It needs Node 22 or newer locally (Node expands the file pattern itself); the app's `engines` setting is not changed.
- First tests (pure logic only):
  - `roomBounds`: clamp at each wall, rotated footprint at 90°, tilted object lift, object wider than the room.
  - `layoutFile`: save then open gives the same room and objects; invalid files are refused; `hidden` and `screenInches` survive; numbering continues after the highest number.
  - `frame.isInFrame`: fully in, partly in, fully out, behind the camera.
  - `zip.makeZip`: header fields and CRC-32 of a known file.
  - `_restyle-prompt`: image numbers follow the order render, room photo, object photos.
  - `_limits` status and `services/restyle` count parsing and limit messages.
- Small pure helpers the tests need may be exported. Files that touch `document` or `window` when imported (`uiStore`) stay out of the tested imports.
- The `verifier` subagent runs `npm test` too.

### I.6 Lint rules and shared angle helpers
- `.oxlintrc.json` adds the hook dependency rule (`exhaustive-deps`) and keeps the default correctness rules. Existing warnings are fixed or explained in a comment.
- Degrees ↔ radians and the 0–359 normalization live once in `store/roomBounds.js`. `layoutFile.js`, `panel/ObjectDetails.jsx` and `scene/ObjectWidget.jsx` use them.

### I.7 Reference objects hook
- The selectors that decide which objects get a card read no store inside: `selectReferenceObjects` takes the objects and the Room render's camera, and the sent cards and the photo count take that list of objects. Actions read both stores when they run.
- New hook `useReferenceObjects()` subscribes to the objects and the Room render camera. `ReferenceSection` and `GenerateButton` use it and drop their placeholder subscriptions.

### I.8 Shared restyle limits
- New `shared/restyle.js` (plain JS, no imports): the photo limit (8), the object limit (60), the server body limit (4 MB) and the browser's budget below it. `api/restyle.js` and `services/restyle.js` import it, and neither keeps its own copy.
- Checked with `npx vercel dev` (the function must still bundle) and `RESTYLE_MOCK=1`.
- `CLAUDE.md` Structure lists `shared/`, and the `api/` rule says local imports are allowed. Done in I.16 with the other Structure updates (added 2026-11-04: `CLAUDE.md` has Julia's own uncommitted edit, which must not go into a task commit).
- Tested in `tests/restyleApi.test.js` (added 2026-11-04): the function is imported in Node with `RESTYLE_MOCK=1` (no Gemini call, no counting) and refuses a 9th photo, a body over the limit and a request with no photo.

### I.9 Limit counter in one step
- `api/_limits.js` `reserve` checks and counts in one Upstash `EVAL` Lua script (still plain `fetch`): it adds 1 to the total and the visitor count only when both are below their limits, sets the expiry, and returns the new counts or which limit was reached.
- A refused request no longer adds and removes a count. A failed Gemini call still undoes its count (`release`).
- Replaces the "increments then undoes" rule in the Part F spec (Server section); that line gets a "(changed in Part I, I.9)" note in the I.9 commit.

### I.10 Drag and drop upload
- A Reference card in Reference mode takes a dropped image file. It runs exactly what Upload runs (`setReferencePhotoFile`, the Part F checks and messages). Several files dropped: the first one is used.
- While a file is held over a card, the card shows a highlight. A Creative card ignores drops.
- A file dropped anywhere else on the page does nothing (the browser must not open it and lose the session).

### I.11 Undo and redo
- **Undo** reverts the last change to the room or the objects, one step per gesture:
  - a drag in 3D, a widget move or rotate drag (from press to release);
  - editing one number field (from focus or press to commit);
  - a color pick (one step for the whole pick);
  - Add, Delete, Hide or Show, a room size change (with the I.1 clamp).
- **Redo** applies an undone step again. Any new change after an undo clears the redo steps.
- Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo (Cmd on Mac), in Plan only, and not while typing in a field or with a dialog or menu open. Undo and Redo icon buttons at the top left of the scene, each disabled when there is nothing to undo or redo.
- An undone Delete brings the object back with the same name, number, color and reference photo (the photo is kept while the object can still come back).
- At most 50 steps, memory only. New Project and Open Project clear the history.
- The selection is cleared if the selected object is gone after an undo or redo.
- The history logic gets tests (I.5).

### I.12 Room render data in one place
- `modeStore` keeps one `roomRender: { image, objects, view } | null` instead of `snapshot`, `snapshotObjects` and `snapshotView`.
- The projection onto the frame (an object's position in percent, the in-frame check) lives only in `services/frame.js`. `framePosition` moves there; its unused `inFrame` field is removed.
- `docs/SPEC.md` data model updated in the same commit.
- `framePosition` gets tests in `tests/frame.test.js` now that it lives in `services/frame.js` (added 2026-11-04).

### I.13 Fixed 1920 × 1080 Room render
- The Room render is always 1920 × 1080, whatever the window size. It is rendered once into an off-screen target, not cut from the Plan canvas.
- It shows exactly what the frame guide shows: a copy of the Plan camera with aspect 16:9 and the field of view of the frame (wider than the frame in a tall window, it is narrowed to match).
- Same look as today: white background, helpers and hidden objects left out, the same walls hidden, smooth edges.
- Object positions and the in-frame check use this fixed camera and size, so cards and positions no longer change with the window size.
- Replaces the Part E rule "Size is the on-screen frame size × pixel ratio, at most 1920 × 1080"; that line gets a "(changed in Part I, I.13)" note in the I.13 commit.

### I.14 Placeable camera
- One camera per project, shown as a small camera model with a view direction in Plan, and as "Camera" at the top of the Objects list. It cannot be deleted.
- It is moved with the existing widget (move on the floor, turn around the vertical axis). Object details for the camera: X, Z, height, pan, tilt, and the lens (field of view).
- The Room render is taken from this camera (I.13 target), not from the orbit view. Walls are hidden for this camera, whatever the orbit view shows.
- The frame guide is replaced by a small 16:9 live preview of the camera's view in a corner of the scene.
- The camera is saved in the layout file as an optional `camera` field. Files without it still open, with the camera at the default Plan view.
- The camera model and its marker are helpers: never in the Room render.

### I.15 Wall shades test (rooms with several pieces)
- Prompt and model work only, no UI. Goal: T3 (the room corner stays in place) and T11 (a reference's chaise is kept) pass with several pieces.
- Test: make Room renders with one clearly different light shade per wall (a local change to `WALL_COLOR` in `scene/Walls.jsx`), save requests from the app, add a prompt line saying the shades only mark the corners and every wall gets the same finish, and run T3 and T11 with `scripts/try-restyle.mjs` (3 runs each, several pieces).
- Results go into `docs/prompts/restyle.md`. Keep the shades (and the prompt line as v4) only if T3 or T11 improve; the shades must look the same in both themes. Otherwise nothing changes, and "another model" stays in the Backlog.
- Run after I.13 and I.14, so the test uses the final Room render.
- Split (added 2026-11-04): I.15 prepares the test (a local-only switch for the shaded walls, the v4 prompt line as an option in `scripts/try-restyle.mjs`, the steps written in `docs/prompts/restyle.md`). Julia makes the renders and runs it (I.15.1), because it needs the browser and paid Gemini calls.

## Tasks
- ✅ I.1 Objects stay inside a smaller room: `NumberField` `onCommit`, `objectsStore.fitToRoom`, the room fields clamp on commit.
- ✅ I.2 One download helper in `services/download.js` (later revoke, ZIP code out of `PersonalizeMode`, one data URL helper).
- ✅ I.3 Error boundary with Save layout and Reload, also on WebGL context loss.
- ✅ I.4 Object catalog without React: `catalog.js` data only, `models.js` for the components, `CLAUDE.md` catalog rule.
- ✅ I.5 Tests with `node:test` in `tests/`, `npm test`, full file extensions in the tested files, the verifier runs them.
- ✅ I.6 Lint rules and shared angle helpers.
- ✅ I.7 `useReferenceObjects` hook; selectors take the Room render camera as an argument.
- ✅ I.8 Shared restyle limits in `shared/restyle.js`.
- ✅ I.9 Limit counter in one Lua script.
- ✅ I.10 Drag and drop upload on the Reference cards.
- ✅ I.11 Undo and redo for room and object changes, one step per gesture.
- ✅ I.12 Room render data in one place (`roomRender`, projection in `services/frame.js`).
- ⬜ I.13 Fixed 1920 × 1080 Room render.
- ⬜ I.14 Placeable camera.
- ⬜ I.15 Wall shades test for rooms with several pieces.
  - ⬜ I.15.1 Make the shaded renders, run T3 and T11, record the results and the decision (Julia) (added 2026-11-04)
- ⬜ I.16 Docs (`CLAUDE.md` Structure, including `shared/` and local imports in `api/` from I.8, `docs/SPEC.md` roadmap, layout, data model and part table), `npm run build`, deploy, check on the live site.

## Acceptance criteria
- [x] I.1: a sofa against the right wall, room width typed from 10 to 3: the sofa does not move while typing and sits inside the new wall after blur. The same with the minus button and with a drag on the field.
- [ ] I.2: Save, Save As, "Download this image" and "Download all as ZIP" work in Chrome, Firefox and Edge; the ZIP opens and matches the thumbnails.
- [ ] I.3: a model that throws on purpose shows the error screen, not a blank page; Save layout downloads the layout; Reload works.
- [ ] I.4: no file under `src/store/` or `src/services/` imports a `.jsx` file; all six types still add, render and save.
- [ ] I.5: `npm test` passes and fails when a clamp limit is changed on purpose.
- [ ] I.6: `npm run lint` passes with the new rules.
- [ ] I.7: cards and the Generate state follow a new Room render with no placeholder subscriptions left.
- [ ] I.8: `MAX_PHOTOS` and the body limits exist only in `shared/restyle.js`; a restyle request in `npx vercel dev` with `RESTYLE_MOCK=1` passes the server checks.
- [ ] I.9: with `RESTYLE_VISITOR_LIMIT=2` locally, the third Generate gets the limit message and the visitor count in Upstash stays at 2.
- [ ] I.10: a dropped JPG shows the same preview as Upload; a dropped PDF shows the Part F message; a Creative card ignores drops; a file dropped outside the cards changes nothing.
- [ ] I.11: a sofa dragged across the room comes back in one Ctrl+Z and goes again with one Ctrl+Shift+Z; an undone Delete brings back "Sofa 2" with its photo; a typed room width and its clamp undo in one step; a new change after an undo disables Redo; nothing happens in Personalize or while typing.
- [ ] I.12: Plan and Personalize behave as before.
- [ ] I.13: the Room render is 1920 × 1080 with a narrow and with a wide window, and shows what the frame guide showed; cards are the same in both windows.
- [ ] I.14: the Room render comes from the placed camera; the preview matches it; the camera survives Save and Open; an older file opens with the default camera.
- [ ] I.15: T3 and T11 results (3 runs each) are in `docs/prompts/restyle.md`, with the decision.
- [ ] No console errors.
- [ ] `npm run build`, `npm run lint` and `npm test` succeed.
- [ ] Deployed and working on the live Vercel URL, without the test limits set.

## Backlog
- Autosave the layout in the browser (`layoutData` and `importLayout`), restored on load.
- Split three.js and drei into their own chunk, so a deploy doesn't make visitors download them again (measure first; 323 kB gzipped today).
- Keep AI versions as Blobs with object URLs instead of data URLs (less memory with 6 versions).
- Another image model for rooms with several pieces, if I.15 does not help (with a decision record).
- Part J: "Save the Module": save the camera position together with the room styles. (from Part H)
- Part J: doors and windows. (from Part H)

## Open questions
- None blocking. Answered 2026-11-04: undo covers all room and object changes, with redo; one camera per project, always present, the Room render always from it, the frame guide replaced by its preview; the I.15 test is prepared here and run by Julia (I.15.1).

## Changelog
- 2026-11-04: Draft created from the code review (bugs, architecture, tests) and five backlog items picked by Julia (drag and drop upload, undo, fixed 1920 × 1080 render, placeable camera, wall-shade test). Order: bugs first, then the code changes the later tasks build on, then the backlog items, the render work last so the wall-shade test uses the final Room render. "Save the Module" and doors and windows move from Part I to Part J.
- 2026-11-04: Spec approved, Part I started (In progress).
- 2026-11-04: Open questions answered (Julia): I.11 adds redo (moved from the Backlog); I.14 confirmed as proposed; I.15 split, the run is I.15.1. I.3 to I.15 run in batch mode with one subagent per task; Julia reviews everything before I.16.
