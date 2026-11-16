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
- (added 2026-11-14) Wall settings: choose how thick a wall is, and select several walls to change their thickness together. (Part J)
- (added 2026-11-15) A front view of a wall while a window is placed or selected in Build, to see how tall it is and how high its sill sits, since Plan cannot change them yet. (Part J)

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
- (added 2026-11-16) Wall helpers in one place, as the first task of Part K, before angled walls: `roomWalls` also gives each wall's direction, plus `alongWall`, `wallPoint` and one 5 cm `snapToStep` in `roomShape.js`. Today the direction and "how far along the wall" are worked out again in `openings.js`, `BuildScene.jsx`, `BuildOpenings.jsx`, `PlaceOpening.jsx`, `Openings.jsx`, `OpeningDistances.jsx`, `BuildDistances.jsx` and `openingPlacement.js`, and the snap in `roomStore.js` (`WALL_SNAP`, `roundToStep`), `openings.js`, `Openings.jsx` and `BuildOpenings.jsx`. (Part J, for Part K)
- (added 2026-11-16) One selection store (`selectionStore.js`: object, opening, wall and the tool that is on), where selecting one lets the others go and a selection whose thing is gone is dropped. Today `selectedId` is in `objectsStore`, the rest in `uiStore`, and "never selected together" is kept by hand in `Openings.jsx`, `OpeningList.jsx`, `PlanMode.jsx`, `BuildMode.jsx`, `modeSwitch.js` and a subscription in `ControlPanel.jsx` that only runs while that panel shows. (Part J, for Part K)
- (added 2026-11-16) One scene drag hook (`scene/useSceneDrag.js`) for the pointer capture, pausing the controls, the undo step and the clean-up when the thing is removed mid-drag. Today it is written out in `Objects.jsx`, `Openings.jsx`, `BuildOpenings.jsx` and `BuildScene.jsx`; a missed `endGesture` in any of them blocks undo. (Part J, for Part K)
- (added 2026-11-16) One place for shortcuts (`layout/useShortcuts.js`, mounted in `App.jsx`), with keys by mode. Today Plan's keys are in `panel/useObjectShortcuts.js`, Build's in an effect in `BuildScene.jsx` (which imports `focusIsFree` from `panel/`), and deleting a door or window is written twice. (Part J, for Part K)
