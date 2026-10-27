# Part E: Personalize

Status: **Draft**. Builds on Part D (scene, widget, selection, OrbitControls as default controls).

## Goal
The app gets two modes, Plan and Personalize, switched from a slim top bar. Plan is today's editor plus a 16:9 frame guide. Pressing Personalize takes a clean snapshot of the room inside the frame and shows it above an empty black "AI image" slot, next to an empty control panel. Nothing in the room, the selection or the camera is lost when switching back.

## Requirements

### Top bar and modes
- A top bar about 44 px high across the page, with a segmented switch "Plan | Personalize" centered in it. The switch is wide enough to click easily, not full width.
- Plan is the mode on page load.
- The mode lives in a Zustand store (`modeStore`). No routing.
- `App.jsx` holds only the top bar and renders exactly one mode: `PlanMode` or `PersonalizeMode`. No scene, panel or Canvas code in `App.jsx`.
- All state lives in stores (room, objects, selection, mode, Plan camera, snapshot, panel width, open sections, frame toggle), never in a mode component.

### Plan mode
- Same as today: left control panel with draggable divider, 3D scene on the right, below the top bar.
- A 16:9 frame guide is centered over the scene. The area outside the frame is slightly dimmed. If the scene is narrower than 16:9, the frame fits the width; otherwise it fits the height.
- The frame does not block the scene: orbit, click, drag and widget work through it.
- A toggle button at the top right of the scene shows or hides the frame. Visible by default.
- The frame is only a page guide and is never part of the snapshot.

### Snapshot
- Taken automatically when Personalize is pressed, fresh every time, while the Plan scene is still on screen.
- Shows exactly what is inside the frame, from the Plan camera. Size is the on-screen frame size × pixel ratio, at most 1920 × 1080.
- Does not contain the selection box, the widget, the frame guide or any helper (helpers carry `userData.helper`).
- Kept in memory only (`modeStore`), as a PNG data URL.
- If it can't be taken (WebGL context lost, no canvas), the mode still switches and the "Room render" slot shows black with "No render".

### Back to Plan
- Returning to Plan shows the same camera view (position and orbit target), the same objects and the same selection.
- The panel width and the open or closed state of Room configuration and Objects are kept.

### Personalize mode
- Uses the same `SplitLayout` as Plan, below the top bar: images on the left, panel on the right. It starts at 60 | 40, and the divider can be dragged (left side 50–85%, so the panel stays 15–50%). The position is kept when switching modes.
- Left 60%: two equal 16:9 images stacked, each with a caption. Top: the snapshot, "Room render". Bottom: "AI image", plain black and empty. Both fit the available height without scrolling.
- Right 40%: an empty control panel in the same style as Plan's (background, padding, scrolling). No groups or controls yet. Groups are added later as `Section`s using the shared `ui/` components.

### Safety
- Delete, Backspace and Escape do nothing in Personalize: no object is deleted or deselected.

## Tasks
- ✅ E.1 Mode store and top bar
  - ✅ E.1.1 `modeStore.js`: `mode` ('plan' on load), `setMode`
  - ✅ E.1.2 `ui/SegmentedSwitch.jsx` and `layout/TopBar.jsx` with "Plan | Personalize"; App shows the top bar above the current screen
- ✅ E.2 Move today's screen into `modes/PlanMode.jsx`; App renders only the top bar and one mode (Personalize shows an empty placeholder for now)
- ✅ E.3 UI state into stores, so nothing resets when Plan unmounts
  - ✅ E.3.1 `SplitLayout` generic (`left`, `right`, `percent`, `onPercentChange`, `min`, `max`); `uiStore.js` with `planPercent` (20) used by PlanMode
  - ✅ E.3.2 `Section` optional `id`: open state in `uiStore`; ids on Room configuration and Objects
- ✅ E.4 Frame guide
  - ✅ E.4.1 `scene/FrameGuide.jsx`: centered 16:9 frame with dimmed outside, fits width or height, does not block pointer events
  - ✅ E.4.2 Toggle at the top right of the scene (`ui/Button` with `pressed`); `frameVisible` in `uiStore`, true by default
- ✅ E.5 Plan camera saved and restored (`scene/PlanCamera.jsx`, `planView` in `modeStore`)
- ✅ E.6 Snapshot
  - ✅ E.6.1 `SnapshotBridge` + `snapshot.js`: `capture(frameRect)` renders, crops to the frame, caps at 1920 × 1080, returns a data URL or null
  - ✅ E.6.2 Helpers hidden during capture: selection box (`userData.helper`) and both widget controls
  - ✅ E.6.3 Personalize button captures first, stores `snapshot`, then switches mode
  - ✅ E.6.4 Scene pane gets an explicit white background, also used as the snapshot background (added 2026-10-27: the canvas is transparent, so the render would otherwise have no background)
- ✅ E.7 Personalize layout
  - ✅ E.7.1 `PersonalizeMode` uses `SplitLayout`: starts 60 | 40, left limits 50–85, `personalizePercent` in `uiStore`
  - ✅ E.7.2 Two stacked 16:9 slots with captions: snapshot ("Room render", "No render" when null) and black "AI image"
  - ✅ E.7.3 `panel/PersonalizePanel.jsx`: empty panel shell in the Plan panel style
- ⬜ E.8 Shortcut guard: Delete, Backspace and Escape ignored outside Plan
- ⬜ E.9 Docs: CLAUDE.md Structure (modes/, layout/, panel/ wording)
- ⬜ E.10 Build passes and deploy (last task of the part)

## Out of scope
Image upload. Any AI call, API key, serverless function or prompt. Controls in the Personalize panel. Saving the snapshot to disk or between reloads. Editing the room in Personalize.

## Acceptance criteria
- [ ] A fresh page opens in Plan with a top bar and a centered "Plan | Personalize" switch.
- [ ] Plan looks and works as at the end of Part D (panel, divider, orbit, select, drag, widget).
- [ ] A 16:9 frame with a dimmed outside shows over the scene by default; the toggle hides and shows it.
- [ ] With a narrow scene pane the frame fits the width; with a wide one it fits the height.
- [ ] Orbit, click-to-select and drag still work over the frame and the dimmed area.
- [ ] Pressing Personalize shows a 60 | 40 layout: "Room render" on top, black "AI image" below, empty panel on the right.
- [ ] The Personalize divider can be dragged; the panel stays between 15% and 50%; its position is kept after switching to Plan and back.
- [ ] The Room render matches what was inside the frame, and has no selection box, widget or frame.
- [ ] The snapshot is at most 1920 × 1080 and 16:9.
- [ ] Moving the camera or a sofa in Plan and pressing Personalize again gives a new snapshot.
- [ ] Back in Plan, the camera view, objects, selection, panel width and open sections are the same as before.
- [ ] In Personalize, Delete, Backspace and Escape do not delete or deselect the selected sofa.
- [ ] No console errors when switching modes repeatedly.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- Manual "Refresh render" button in Personalize.
- A placeable camera object in the room (the render taken from it instead of the orbit camera).
- Fixed 1920 × 1080 render through a render target, independent of window size.
- Keep the Personalize panel's group state in `uiStore` once groups exist.

## Open questions
- None blocking.

## Changelog
- 2026-10-27: Draft created. Scope: Plan and Personalize modes, top bar switch, 16:9 frame guide, snapshot on switch, Personalize layout with empty panel shell, shortcut guard. Image upload and AI out of scope.
- 2026-10-27: Personalize reuses `SplitLayout` (starts 60 | 40, draggable) instead of a fixed layout; `SplitLayout` made generic with one stored position per mode.
