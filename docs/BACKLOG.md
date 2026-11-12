# Backlog

Every idea that is not part of the current part goes here, with the date it was
added and the part it came from. Review it at the start of each part: an idea
picked up becomes a numbered task in that part's spec and is removed here.

Gathered on 2026-11-12 from the Backlog sections of Parts A to J. Items that a
later part already built, or that Part J plans as a task, were left out.

## Room and building
- Walls drawn freely instead of cut and drag, after testing with real users. (Part J)
- Angled walls. (Part J, for Part K)
- Snap to wall. (Part G, from the style mock)

## Placing and moving objects
- Move objects up and down (Y), for wall items and shelves; decide the floor and ceiling rules then. (Part D)
- A tall object tilted over can poke through the ceiling (no ceiling clamp). (Part D)
- Tilting with the widget (X and Z rings). (Part D)
- Objects overlap each other while dragging (no collision or snapping). (Part D)
- A new object placed after a delete can land on an existing one: placement counts objects, not free spots. (Part C)
- (added 2026-11-10) Zoomed in close on a big piece, the rotate ring can lie entirely over the object, and a press there moves it (J0.2), so the ring cannot be grabbed; rotate from Object details then. A rotate-only mode could fix it. (Part J)
- (added 2026-11-10) Show a piece's front in the Plan view and the Room render, e.g. the TV's back in dark grey instead of black, so a piece turned the wrong way is easy to see (found in I.19). (Part I)

## Object details
- Edit object size (width, depth, height) for objects other than the TV, with limits to decide. (Parts C, D, G)
- Color swatches next to the native picker. (Parts C, D)
- A `.glb` sofa model instead of primitives. (Part B)

## Views
- (added 2026-11-12) Improve how Walk looks and feels: the view from inside the room, and the way of looking and walking. A joystick circle was tried and dropped (J.1.2). (Part J)
- A scene toolbar. (Part G, from the style mock)

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
