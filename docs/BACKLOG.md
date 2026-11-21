# Backlog

Every idea that is not part of the current part goes here, with the date it was
added and the part it came from. Review it at the start of each part: an idea
picked up becomes a numbered task in that part's spec and is removed here.

Part K (2026-11-21) picked up: angled walls, snap to wall, wall thickness, Walk look and feel, the scene toolbar and the four code-health items (wall helpers, selection store, scene drag hook, shortcuts): they are tasks K.4 to K.8, and left this list.

Gathered on 2026-11-12 from the Backlog sections of Parts A to J. Items that a
later part already built, or that Part J plans as a task, were left out.

## Room and building
- Walls drawn freely instead of cut and drag, after testing with real users. (Part J)
- (added 2026-11-15) A front view of a wall while a window is placed or selected in Build, to see how tall it is and how high its sill sits, since Plan cannot change them yet. (Part J)

- (added 2026-11-21) The door and window placing tools of Plan (J.9.4: `PlaceOpening*`, the wall layers, `TOOL_NOTICES_3D`) are not reachable any more, since K.1.9 removed their buttons from Plan's panel. Move them into Build's tools or delete them when the build-mode work comes. (Part K, K.1.9)

## Placing and moving objects
- Move objects up and down (Y), for wall items and shelves; decide the floor and ceiling rules then. (Part D)
- A tall object tilted over can poke through the ceiling (no ceiling clamp). (Part D)
- Tilting with the widget (X and Z rings). (Part D)
- Objects overlap each other while dragging (no collision or snapping). (Part D)
- (added 2026-11-10) Zoomed in close on a big piece, the rotate ring can lie entirely over the object, and a press there moves it (J0.2), so the ring cannot be grabbed; rotate from Object details then. A rotate-only mode could fix it. (Part J)
- (added 2026-11-10) Show a piece's front in the Plan view and the Room render, e.g. the TV's back in dark grey instead of black, so a piece turned the wrong way is easy to see (found in I.19). K.2.13 adds a front arrow on the selected piece in Plan; the darker back and the Room render part stay here. (Part I)

## Object details
- Color swatches next to the native picker. (Parts C, D)
- A `.glb` sofa model instead of primitives. (Part B)

## Views
- (added 2026-11-21) The 2D view keeps its zoom when the room's size changes (it fits the room only on New and Open), so after a very small or very large room the room can look tiny or fill the view; and the 3D camera starts inside a 30 m room. "Fit room" below would cover both. (Part K, found in K.1.3)
- (added 2026-11-21) "Fit room" and "Frame selection" camera buttons: Fit room fits the whole room in 2D and 3D (the 2D fit exists as `fitTopView`; 3D has none), Frame selection frames the selected piece, disabled with no selection. The existing "Frame" button (the 16:9 frame guide) stays as it is. (Part K, K.3, dropped from it by Julia)
- (added 2026-11-21) Save a Walk position with each camera slot, so the Walk mini-map shows a pin for every bookmark (a slot is a 3D camera, usually outside the room, so most have no pin). (Part K, K.3)

## Personalize and the AI
- A manual "Refresh render" button in Personalize. (Part E)
- Text instructions next to the photo. (Part F)
- 2K output (needs a way around Vercel's 4.5 MB response limit). (Part F)
- More panel groups in Personalize. (Part F)
- Export tilt (rotation X and Z) to the AI. (Part G)
- Rooms with several pieces: the AI moves the room corner to between the pieces (H.8, T3) and may drop a reference's chaise (T11). Prompt wording, corner positions and a line on the corner did not fix it; the wall shades test (I.15) was not kept. Next idea: another image model, with a decision record. (Parts H, I)
- "Save the Module": keep the AI versions and room styles in the project file next to the camera slots, so a view and its results can be reopened. (Parts H, I)

## Code health
- Autosave the layout in the browser (`layoutData` and `importLayout`), restored on load. (Part I)
- Split three.js and drei into their own chunk, so a deploy doesn't make visitors download them again (measure first; 323 kB gzipped at Part I). (Part I)
- Keep AI versions as Blobs with object URLs instead of data URLs (less memory with 6 versions). (Part I)
