# Part I: Code health and backlog

2026-11-10

## Description
I added three camera slots: you save up to three views of the room in Plan, and in Personalize each one gets its own Room render to restyle. You can now undo and redo changes, drop a photo onto a reference card, and see the project's name next to the logo. I also changed the AI prompt so only the room photo sets the walls and floor, and each piece keeps the direction it faces in the render.

## What's new
- Three camera slots in Plan, and a Camera menu in Personalize: each filled slot gets its own fixed 1920 × 1080 Room render, and each version remembers the camera it was made from (I.13, I.14.1 to I.14.3).
- Save writes into the opened or last saved project file, Save As asks in the system window, and the project name shows next to the logo ("New Project" until saved). Chrome and Edge only; Firefox and Safari keep the download (I.17).
- Undo and redo for room and object changes, one step per gesture, with Ctrl+Z and Ctrl+Shift+Z or Ctrl+Y, and two buttons at the top left of the scene (I.11).
- Drag and drop upload on the Reference cards. A file dropped anywhere else does nothing (I.10).
- An error screen with Save layout and Reload instead of a blank page, also when the 3D view loses WebGL (I.3).
- AI prompt v8 and v9: if the room photo has plain walls, they stay plain (6 of 6 runs, v7: 5 of 6), and each piece with a front keeps the direction it faces in the Room render (TV screen toward the camera 5 of 6 runs, v8: 2 of 6). Both tested on one saved room, 6 paid runs each (I.18.3, I.19).

## Screenshots
None yet. The screenshot script could not run: Playwright is not installed, and the install command (`npm install --no-save playwright`) was refused by the permission check in this session. Run these two commands, then the script:

```
npm install --no-save playwright
npx playwright install chromium
node scripts/portfolio-shots.mjs --out docs/portfolio/images/part-i
```

Planned files, captions and alt text for when they exist:

| File | Caption | Alt text |
|---|---|---|
| `images/part-i/plan-light.png` | Plan mode, light theme. | Maketa Plan mode in the light theme: a furnished living room in 3D with a sofa, armchair, coffee table, TV stand, bookshelf and floor lamp, the control panel beside it and three camera slots under the scene. |
| `images/part-i/plan-dark.png` | Plan mode, dark theme. | The same furnished room in Maketa Plan mode in the dark theme, with the control panel and the camera slots. |
| `images/part-i/personalize-light.png` | Personalize mode with the Room render, light theme. | Maketa Personalize mode in the light theme: the grey Room render of the furnished room with the Camera menu at its top left, and the reference cards for the room and the furniture. |
| `images/part-i/personalize-dark.png` | Personalize mode with the Room render, dark theme. | The same Personalize view in the dark theme: the Room render, the Camera menu and the reference cards. |

The test room (`docs/portfolio/maketa-layout.json`) has no saved cameras, so the Plan shots show three empty slots. Check each image before use: the room is furnished, there is no error message, and nothing private shows.

## Missing screenshots
Take these by hand on https://maketa3-d.vercel.app, in a 1440 × 900 window, light theme unless noted:
- **AI result:** Personalize, Camera 1, a room photo and at least one object photo on the cards, after Generate. Capture the Room render and the AI image together, with the version thumbnails below.
- **Camera slots filled:** Plan, with two slots filled from two clearly different views and the third empty (big plus). Hover a filled slot so the update icon and the X show. The active slot is highlighted.
- **Camera menu open:** Personalize with two cameras, the Camera menu at the top left of the Room render opened, showing Camera 1 and Camera 2.
- **Version keeps its camera:** Personalize with versions made from Camera 1 and Camera 2. Click a Camera 2 thumbnail so the menu shows Camera 2 and both top images match.
- **Project name:** the top bar after Save As as "My Project": the name to the right of the Maketa logo. Optional second shot: a new project showing "New Project".
- **Undo and Redo:** Plan, top left of the scene, after one change, so Undo is active and Redo is disabled.
- **Drag and drop:** Personalize, a photo file held over a Reference card, so the drop highlight shows.
- **Error screen (optional):** only with a component made to throw on purpose in `npm run dev`, so it can't be taken on the live site. It shows "The 3D view stopped working." with Save layout and Reload.

## Not claimed
- The acceptance criteria in the spec are not ticked, except I.1. The Changelog says Julia checked camera slots, the Camera menu, Save after Open and a Generate with v9 on the live site. Undo and redo, drag and drop, the error screen and the 1920 × 1080 size are ticked tasks, but their acceptance checks are not ticked.
- The prompt numbers come from one saved room (`simple-corner.json`), 6 runs per version, scored by Claude. They are not a general success rate.
- The v7 room-only line (I.18.2) went live by Julia's choice, without the full test run of I.18.1. Only T12 was run (v3 passed it 3 of 3).
- I.15 wall shades test: no improvement seen and not kept. The scripted T3 and T11 runs were not done. "Another image model" stays in the Backlog.
- I.14 placed camera: built, then replaced by the camera slots. It is not in the app.
- Save into the opened file works only in Chrome and Edge.
- Backlog, not done: autosave, a split three.js bundle, AI versions as Blobs, another image model, showing a piece's front in the render. Part J: "Save the Module" and doors and windows.
- The code work (catalog without React, `node:test` tests, lint rules, shared limits, the one-step limit counter) is done, but it is not visible to a visitor, so it stays out of the description.
