# Part H: Version history, download, a reference image per object

Status: **Draft**. Builds on Part F (AI restyle) and Part G (soft UI, six object types, Project menu).

## Goal
1. Every generated image is kept as a thumbnail under the AI image. I can switch between up to 6 versions and download the one I see.
2. Each placed object gets its own reference image (or a "Creative" setting) instead of one photo for the whole room. The room itself (walls, floor, light) gets its own card too.
3. The daily limits can be raised for testing without touching the public limits.

## Decisions
- Reference images belong to **each placed object**: Sofa 1 and Sofa 2 each get their own. Each photo is for exactly one item (or for the room).
- Each card has a **Reference | Creative** switch. If I press Generate and a Reference card has no image, it switches to Creative by itself.
- A **Reference Room** card styles the walls, floor and light. Its photo counts toward the 8-photo limit.
- Limits come from **environment variables**. The public defaults stay 3 per visitor and 20 per day.
- **Leaving Personalize asks first.** Going back to Plan clears the versions (after a confirmation), so every version always belongs to the current Room render.
- At **6 versions** Generate is blocked until I delete one.
- Objects outside the 16:9 frame, and objects switched to **Hidden** in Plan, get **no reference card** and are not sent (H.6.2, H.7.1).

## Out of scope
- Saving versions or references across reloads (memory only, like the Part F photo).
- Text instructions, drag and drop, editing an image.
- Doors and windows (Part J).
- Saving a camera view with its styles (Part J, see Backlog).

## Requirements

### Version history
- Under the AI image there is a row of up to 6 thumbnails. Each Generate that succeeds adds a new thumbnail at the end and selects it.
- Clicking a thumbnail shows that version in the big AI image slot. Each version stores the Room render it was made from (`roomRender`), and the top left slot shows it, so the two top images always match.
- Each thumbnail shows a small round button with an X at its top left. It appears only while the mouse is over that thumbnail (and also while it has keyboard focus). Clicking it deletes that version, with no confirmation.
- If the selected version is deleted, the next one is selected (or the previous one if it was last). With no versions left, the AI image slot is black again and the top left shows the current Room render.
- Maximum 6. At 6, Generate is disabled and the message says "6 versions is the maximum. Delete one to make room."
- While a request runs, the big image keeps the selected version, dimmed, with the "Generating…" label (as in Part F).
- Versions are lost on reload.

### Leaving Personalize
- Switching from Personalize to Plan while there are versions, or while a request is running, opens the shared `ui/Dialog`: title "Go back to Plan?", message "Your AI versions will be cleared.", buttons Cancel and "Go to Plan".
  - Confirm: all versions are cleared, a running request is ignored when it answers (its count still updates "N of X left"), then Plan opens.
  - Cancel: I stay in Personalize and nothing changes.
- With no versions and no request running, Plan opens straight away.
- Reference photos and modes are kept when switching modes.
- Coming back to Personalize takes a new Room render, as in Part E. The AI slot is black until the next Generate.

### Download
- A small round download button at the top right of the AI image, shown only when a version is selected. It opens a small menu:
  - **Download this image**: the version on screen, as one image file.
  - **Download all (N) as ZIP**: every version in one ZIP file, `maketa-restyles.zip`, so there is one save prompt and one place (separate files would ask once per file in a browser set to ask where to save).
- Each image (alone or inside the ZIP) is named `maketa-restyle-<number>.<ext>`, using the image's own type (`png` or `jpg`). `<number>` counts up per version in the session and is not reused. The ZIP is made in the browser (stored, no compression, no library). No server call.

### Reference section (Personalize panel)
- One collapsible `Section` titled "Reference". At its top, a "Clear All" button (shared `Button`, secondary) that removes every uploaded photo at once, the room's included. Modes stay as they are. No confirmation.
- First card: **Reference Room**. Reference mode: the walls, floor, light and mood come from its photo; the furniture in that photo is ignored. Creative mode: "The AI will choose walls, floor and light to suit the pieces." Default: Reference.
- Then one **ReferenceCard** per placed object, in the same order as the Objects list. Its title is "Reference" plus the object's list name, for example "Reference Sofa 1".
- Each card contains:
  - the **Reference | Creative** switch (shared `SegmentedSwitch`, default Reference);
  - in Reference mode: Upload photo, then a small preview with Replace and Remove. Same file checks and messages as Part F (JPG, PNG, WebP, 10 MB, decodes);
  - in Creative mode: a short line "The AI will design this one to match the room." and no upload;
- If there are no objects, below the Room card: "Add objects in Plan to give them a reference."
- Deleting an object in Plan (or New Project, or Open Project) removes its card and its photo. Photos stay when switching between Plan and Personalize.

### Objects without a card (H.6.2)
- **Off-frame:** an object gets a card only if some part of it shows in the Room render. One helper (`isInFrame` in `src/services/frame.js`) projects the 8 corners of the object's box with the camera that took the Room render (stored with it as `snapshotView`, now `roomRender.view` since Part I, I.12; not the current Plan camera) and checks whether they overlap the 16:9 frame. A partly visible object is in frame.
- **Hide switch:** every object has an eye button (shared `IconButton`) in the Objects list in Plan and next to its name in Object details. A hidden object (`hidden: true` in `objectsStore`) is not drawn in the Room render; in Plan it stays, drawn faded, and its list row shows an eye with a line through it. Hiding is done in Plan, because the Room render is taken when entering Personalize.
- Under the cards, one line each, only when not empty:
  - "Hidden: Sofa 2." for hidden objects;
  - "Not in the Room render: Coffee table 1, Floor lamp 1." for the other objects without a card.
  - An object that is both hidden and off-frame is listed as hidden.
- A photo uploaded for an object stays in memory while it has no card. When a later Room render has it in frame (or it is shown again), its card returns with the photo.
- `selectReferenceObjects` (`src/store/restyleStore.js`) returns the objects with a card: not hidden and in frame.
- Layout file: a hidden object is saved with `"hidden": true`; shown objects have no flag. Older files without it import as before; a `hidden` that is not true or false makes the file invalid.
- Components:
  - `ReferenceCard` goes in `src/components/panel/`, because it reads the stores and object names.
  - `Thumbnail` (image, selected state, delete button) and `IconButton` are new shared components in `src/components/ui/`, using the Part G soft styles.
  - `SegmentedSwitch`, `Button`, `Section` and `Dialog` are reused as they are.
- The privacy notice now says "Your photos are sent to Google's Gemini API to make the image. Maketa does not store them. Google may keep requests for a short time to detect misuse."

### Generate
- One Generate / Regenerate button in the **top bar, Personalize only**, just before the theme switch (H.5.1; was below the Reference section). "Regenerate" when a version is selected, otherwise "Generate".
- Next to it, to its left: the "N of X left today" count, and before that any message (error, limit, 6 versions) as short red text.
- When pressed:
  1. Every card in Reference mode with no photo is switched to Creative, and the card shows it.
  2. If more than 8 photos would be sent, the extra objects (last in list order) switch to Creative, and a notice says how many.
  3. The request is sent.
- Disabled when there is no Room render, a request is running, 0 generations are left, there are already 6 versions, or **no card has a photo** (H.6.1). At least one reference photo is needed, on any card (the room or an object); the other cards may be Creative or empty. With no photo the message is "Add at least one reference photo."
- "N of X left today", where X comes from the server (see Limits).
- Errors and messages as in Part F. The visitor and total limit messages use the real numbers from the server.

### What is sent to the AI
Each Generate sends the Room render, the room photo (if Reference) and one photo per Reference object, plus a text description of the room card and every object in the frame.

- Per object: its type, its list name, its mode, and its position in the Room render as a percentage from the left and from the top. The position is the center of the object's 3D bounding box, projected through the same camera as the render when the render is taken. For a partly visible object whose center is outside the frame, the position is clamped to the frame's edge. This is how the AI knows which grey box is "Sofa 1" and which is "Sofa 2".
- Only objects with a card are sent (`selectReferenceObjects`, H.7.1): off-frame and hidden objects are not sent, and a partly visible object is. The 8-photo cap and "at least one photo" count the same cards.
- Image order and labels are fixed:
  - image 1 is the Room render;
  - then the room photo, if any, labeled "Room";
  - then the object references in list order, each labeled with its object name.
- Prompt rules for the room:
  - Reference: restyle the walls and floor from its photo (wall color, finish with any paneling or moldings, floor material, light and mood), and ignore the furniture in it.
  - Creative: choose walls, floor and light that suit the pieces.
- Prompt rules per Reference object: use **only** the item named (for example, only the sofa) from its reference photo. Ignore everything else in that photo, such as a table, lamp, plant, walls, floor or decor. Keep that object's position, about its size and its angle from the Room render. Its form comes from the photo, not from the grey shape: a round table stays round on a rectangular shape, a sofa with a chaise keeps the chaise (T11, added 2026-11-03).
- Prompt rules per Creative object: replace the grey placeholder with a plausible piece of that type in a style that fits the room, keeping its position, size and angle.
- All Part F rules stay: keep the room shape and the camera angle, and add nothing that is not in the 3D scene.
- The prompt is a new version in `docs/prompts/restyle.md` and `api/_restyle-prompt.js`.
- Limit: at most **8 reference photos** per request, the room photo included, plus the Room render. The model takes about 10 extra images, and the body must stay under 4 MB. H.8 tested up to 3 photos (4 images); 8 was not tested and stays the limit until a problem shows up.
- Size budget: reference photos are resized on upload to a longest edge of 1024 px at JPEG quality 0.8 (about 150 to 250 KB each; was 1536 px at 0.85). The whole body must stay under 4 MB. If it does not, the photos are resized smaller before sending.

### Limits from environment variables
- Server variables `RESTYLE_VISITOR_LIMIT` and `RESTYLE_TOTAL_LIMIT`. If missing or not a whole number of at least 1, the defaults are 3 and 20.
- `GET` and `POST` answers (including the 429 limit answer) include both numbers, so the page shows "N of X left today" and the messages use them. Remove the hard-coded 3 from the page.
- Public limits (production): **3 per visitor, 20 per day in total**. These are the defaults; nothing is set in Vercel.
- Testing (Julia only, locally): **20 per visitor**. Set it only in the local terminal before `npx vercel dev`: `$env:RESTYLE_VISITOR_LIMIT="20"`. The total stays at its default of 20. Never set the test value in Vercel production.

## Tasks
Order: unblock testing, then what I can see, then references, then the AI side. Each one follows the checkpoint workflow.

- ✅ H.1 Limits from environment variables: server reads both variables, answers include the numbers, the page and messages use them, defaults stay 3 and 20.
- ✅ H.2 Version history in `restyleStore` (`versions: [{ id, number, image, roomRender, createdAt }]`, `selectedVersionId`): Generate adds a version and selects it; the top left image follows the selected version; blocked at 6. The leave-Personalize dialog clears versions.
- ✅ H.3 Thumbnail row with the hover X: shared `Thumbnail` and `IconButton` components.
- ✅ H.4 Download menu at the top right of the AI image: this image, or all versions in one ZIP file.
- ✅ H.5 `ReferenceCard` and references per card in the store (`references: { [objectId | 'room']: { mode, photo, photoError } }`); references of deleted objects are dropped.
  - ✅ H.5.1 Generate button, count and messages move to the top bar, Personalize only, before the theme switch (added 2026-11-03)
- ✅ H.6 Reference section: Clear All, Reference Room card, one card per object, the notice and the empty message (replaces the Part F "Reference image" group: its single photo becomes the Reference Room card).
  - ✅ H.6.1 Generate needs at least one reference photo, on any card (added 2026-11-03)
  - ✅ H.6.2 No reference card for off-frame or hidden objects (`isInFrame` on the box corners with the Room render's camera); Hide switch in the Objects list and Object details; "Hidden" and "Not in the Room render" lines; `selectReferenceObjects`; `hidden` in the layout file (added 2026-11-03)
  - ✅ H.6.3 Reference cards are raised from the section (small raised shadow), like the panel sections, instead of pressed in (added 2026-11-03)
- ✅ H.7 Object positions taken with the Room render; new request format and server checks; Creative switch when there is no photo; the 8-photo cap with its notice; off-frame and hidden objects have no card and are not sent (H.7.1); size budget.
  - ✅ H.7.1 The request and the 8-photo cap use `selectReferenceObjects`, so hidden objects and partly visible objects follow the card rules (added 2026-11-03)
- ✅ H.8 Prompt spike and tuning. Prompt v2 tested with `scripts/try-restyle.mjs` on a request saved from the app (two sofas whose reference photos also show other furniture, a Creative coffee table and a room photo), then on one sofa alone. Prompt **v3** is live; results in `docs/prompts/restyle.md`. Tests:
  - T7 Only the named item is taken from each reference; the table in the "Reference Sofa" photo does not appear.
  - T8 Two objects of the same type are matched by position to the right photo.
  - T9 A Creative object is replaced by a plausible piece with the same position, size and angle.
  - T10 The room photo sets the walls, floor and light, and none of its furniture appears.
  - T1, T2 and T3 from Part F still pass.
  - T11 A reference whose form differs from the grey shape keeps its form (for example the chaise of a sofa) (added 2026-11-03).
  - A test passes when it succeeds in at least 2 of 3 runs. If T7 or T8 fail, stop and show the results before continuing.
  - Result (v3): T7, T8, T9, T10, T1 and T2 pass in both cases. T3 and T11 pass with one sofa (3 of 3) but not with several pieces (T3 0 of 3, T11 1 of 3): the model moves the room corner to between the pieces and may drop a chaise. Accepted as a known limitation (see Backlog).
  - ⏭️ H.8.1 Send the wall corners' positions in the Room render with the request, so the prompt can say where they are (added 2026-11-03). Built and tested (v5): no effect on T3 (0 of 3), so not kept. A dark line drawn on the corner by hand did not fix it either (1 of 3).
- ✅ H.9 Docs (`CLAUDE.md`, `docs/SPEC.md`, the ADR 0001 note on image count), `npm run build`, deploy, check on the live site. In Vercel, do not set the test limits.

## Acceptance criteria
- [ ] H.1: with `RESTYLE_VISITOR_LIMIT=20` set locally, the page shows "20 of 20 left today" and the count goes down; without it, it shows "3 of 3"; the limit messages use the server's numbers.
- [ ] H.2: three Generates give three versions; selecting each changes both top images; the 7th Generate is blocked with the message; going back to Plan with versions asks first, Cancel keeps everything, confirm clears the versions.
- [ ] H.3: the X appears only on hover or focus; deleting the selected version selects a neighbor; deleting all returns to the black slot.
- [ ] H.4: "Download this image" saves one file matching the big image; "Download all" saves `maketa-restyles.zip` with one image per version, matching the thumbnails; the button is hidden when there is no image.
- [ ] H.5: one card per object with the title "Reference <name>"; the mode switch works; upload, Replace and Remove work with the Part F checks; deleting an object removes its card.
- [ ] H.6: one "Reference" section only; the Room card is first; Clear All removes all photos (room included) and keeps the modes; photos survive switching to Plan and back.
- [ ] H.6.1: Generate is disabled with "Add at least one reference photo." until any card has a photo; a photo on one object card alone is enough.
- [ ] H.6.2:
  - A: an object moved fully outside the camera frame has no card in Personalize, and "Not in the Room render: <name>" shows.
  - B: an object only partly visible keeps its card.
  - C: a hidden object is faded in Plan, missing in the Room render, has no card, and "Hidden: <name>" shows; shown again, its card returns with its photo.
  - D: a layout exported with a hidden object imports with it still hidden; an older file without the flag still imports.
  - E: no console errors; `npm run lint` and `npm run build` pass (the repo has no tests).
- [ ] H.6.3: in both themes, each reference card looks raised like the Plan sections; its shadow is not cut off at the edges of the section.
- [ ] H.7: a request with a room photo, two Reference objects and one Creative object passes the server checks; an off-frame object is not sent; a Reference card without a photo turns Creative on Generate; a 9th photo is switched to Creative with the notice; a request over 4 MB is resized or refused with a clear message.
- [ ] H.7.1: a hidden object is not in the request; a partly visible object whose center is outside the frame is sent with its photo (position at the frame's edge); a hidden object's photo is not counted for the 8-photo cap or for "at least one photo".
- [ ] H.8: T7, T8, T9, T10, T1 and T2 pass (2 of 3 runs each); T3 and T11 pass with one piece; with several pieces they are a known limitation.
- [ ] No console errors.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL, without the test limits set.

## Backlog
- Part J: "Save the Module": save the camera position together with the room styles, so a view and its results can be kept and reopened.
- Part J: doors and windows (they get reference cards once they exist).
- Export tilt (rotation X and Z). (from Part G)
- Size editing for objects other than the TV. (from Part G)
- Room layout with several pieces (H.8): the AI moves the room corner to between the pieces (T3) and may drop a reference's chaise (T11). Prompt wording, corner positions in the prompt, and a line drawn on the corner did not fix it. Ideas: walls with clearly different shades in the Room render, or another model. (wall shades test moved to Part I, I.15)
- From the mock: Snap to wall, Undo, scene toolbar. (from Part G) (Undo moved to Part I, I.11)

## Open questions
- None blocking. Answered 2026-11-02: the Room card is part of H and counts toward the 8 photos; blocked at 6 versions; leaving Personalize asks and clears versions; off-frame objects are skipped; titles use the list name ("Reference Sofa 1"); doors and windows come in Part I; test limit is 20 per visitor locally, public stays 3 per visitor and 20 per day.

## Changelog
- 2026-11-02: Draft created from Julia's outline. Changes to the outline: Reference Room card added to H (was open question 1); leaving Personalize asks and clears versions (replaces "a new Room render does not delete versions"); off-frame objects skipped; `SegmentedSwitch` reused (already in `ui/`); `ReferenceCard` in `panel/` instead of `ui/`; Regenerate rule written down; T10 added for the room photo; doors and windows and "Save the Module" moved to Part I.
- 2026-11-03: H.4: the download button opens a menu: "Download this image" or "Download all" in one ZIP file. Separate files for "all" were tried, but a browser set to ask where to save asks once per file.
- 2026-11-03: H.5.1: the Generate button, its count and messages move from the Personalize panel to the top bar (Personalize only), before the theme switch.
- 2026-11-03: H.6 + H.6.1: the Part F "Reference image" group and the H.5 "Reference" section are merged into one "Reference" section (the single image becomes the Reference Room card). Generate now needs at least one photo on any card (was: an all-Creative room allowed). Until H.7, Generate sends one photo: the room's, else the first object photo.
- 2026-11-03: H.6.2: off-frame objects no longer get a faded card: objects outside the Room render (checked on all box corners with the render's camera) and hidden objects get no card, listed in two lines under the cards. New Hide switch per object (Objects list and Object details), saved as "hidden": true in the layout file. `selectReferenceObjects` added; H.7.1 added so the request and the cap use it (the H.7 request is unchanged for now).
- 2026-11-03: H.7.1: the request, the 8-photo cap and the "at least one photo" check use `selectReferenceObjects`: exactly the objects with a card are sent (hidden objects no longer; partly visible objects whose center is off-frame now are).
- 2026-11-03: H.8: prompt v3 live (room photo now restyles walls and floor, including paneling; a reference's form wins over the grey shape; the camera line asks for a result that lines up with the render). T11 added. T3 and T11 with several pieces recorded as a known limitation (Backlog). H.8.1 (corner positions in the request) built, tested and not kept. The prompt script now takes a request saved from the app.
- 2026-11-03: H.6.3: reference cards raised instead of pressed in (Julia), to match the panel sections.
- 2026-11-04: Part I is now "Code health and backlog"; "Save the Module" and doors and windows move to Part J.
