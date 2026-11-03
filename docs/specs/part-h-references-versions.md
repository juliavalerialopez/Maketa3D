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
- Objects outside the 16:9 frame are **skipped** on Generate.

## Out of scope
- Saving versions or references across reloads (memory only, like the Part F photo).
- Text instructions, drag and drop, editing an image.
- Doors and windows (Part I).
- Saving a camera view with its styles (Part I, see Backlog).

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
  - if the object is outside the Room render's frame: "Not in the Room render", and it is not sent.
- If there are no objects, below the Room card: "Add objects in Plan to give them a reference."
- Deleting an object in Plan (or New Project, or Open Project) removes its card and its photo. Photos stay when switching between Plan and Personalize.
- Components:
  - `ReferenceCard` goes in `src/components/panel/`, because it reads the stores and object names.
  - `Thumbnail` (image, selected state, delete button) and `IconButton` are new shared components in `src/components/ui/`, using the Part G soft styles.
  - `SegmentedSwitch`, `Button`, `Section` and `Dialog` are reused as they are.
- The privacy notice now says "Your photos are sent to Google's Gemini API to make the image. Maketa does not store them. Google may keep requests for a short time to detect misuse."

### Generate
- One Generate / Regenerate button below the Reference section, always visible. "Regenerate" when a version is selected, otherwise "Generate".
- When pressed:
  1. Every card in Reference mode with no photo is switched to Creative, and the card shows it.
  2. If more than 8 photos would be sent, the extra objects (last in list order) switch to Creative, and a notice says how many.
  3. The request is sent.
- Disabled when there is no Room render, a request is running, 0 generations are left, or there are already 6 versions. It is not disabled for lack of photos, because an all-Creative room is allowed.
- "N of X left today", where X comes from the server (see Limits).
- Errors and messages as in Part F. The visitor and total limit messages use the real numbers from the server.

### What is sent to the AI
Each Generate sends the Room render, the room photo (if Reference) and one photo per Reference object, plus a text description of the room card and every object in the frame.

- Per object: its type, its list name, its mode, and its position in the Room render as a percentage from the left and from the top. The position is the center of the object's 3D bounding box, projected through the same camera as the render when the render is taken. This is how the AI knows which grey box is "Sofa 1" and which is "Sofa 2".
- Objects whose center is outside the frame or behind the camera are left out completely.
- Image order and labels are fixed:
  - image 1 is the Room render;
  - then the room photo, if any, labeled "Room";
  - then the object references in list order, each labeled with its object name.
- Prompt rules for the room:
  - Reference: take only the walls, floor, light and mood from its photo, and ignore the furniture in it.
  - Creative: choose walls, floor and light that suit the pieces.
- Prompt rules per Reference object: use **only** the item named (for example, only the sofa) from its reference photo. Ignore everything else in that photo, such as a table, lamp, plant, walls, floor or decor. Keep that object's position, size and angle from the Room render.
- Prompt rules per Creative object: replace the grey placeholder with a plausible piece of that type in a style that fits the room, keeping its position, size and angle.
- All Part F rules stay: keep the room shape and the camera angle, and add nothing that is not in the 3D scene.
- The prompt is a new version in `docs/prompts/restyle.md` and `api/_restyle-prompt.js`.
- Limit: at most **8 reference photos** per request, the room photo included, plus the Room render. The model takes about 10 extra images, and the body must stay under 4 MB. The number 8 must be confirmed in the prompt spike (H.8).
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
- ⬜ H.6 Reference section: Clear All, Reference Room card, one card per object, the notice and the empty message (replaces the Part F "Reference image" group).
- ⬜ H.7 Object positions taken with the Room render; new request format and server checks; Creative switch when there is no photo; the 8-photo cap with its notice; off-frame objects skipped; size budget.
- ⬜ H.8 Prompt spike and tuning. Prompt v2 tested by hand with two objects whose reference photos also show other furniture, and a room photo. Tests:
  - T7 Only the named item is taken from each reference; the table in the "Reference Sofa" photo does not appear.
  - T8 Two objects of the same type are matched by position to the right photo.
  - T9 A Creative object is replaced by a plausible piece with the same position, size and angle.
  - T10 The room photo sets the walls, floor and light, and none of its furniture appears.
  - T1, T2 and T3 from Part F still pass.
  - A test passes when it succeeds in at least 2 of 3 runs. If T7 or T8 fail, stop and show the results before continuing.
- ⬜ H.9 Docs (`CLAUDE.md`, `docs/SPEC.md`, the ADR 0001 note on image count), `npm run build`, deploy, check on the live site. In Vercel, do not set the test limits.

## Acceptance criteria
- [ ] H.1: with `RESTYLE_VISITOR_LIMIT=20` set locally, the page shows "20 of 20 left today" and the count goes down; without it, it shows "3 of 3"; the limit messages use the server's numbers.
- [ ] H.2: three Generates give three versions; selecting each changes both top images; the 7th Generate is blocked with the message; going back to Plan with versions asks first, Cancel keeps everything, confirm clears the versions.
- [ ] H.3: the X appears only on hover or focus; deleting the selected version selects a neighbor; deleting all returns to the black slot.
- [ ] H.4: "Download this image" saves one file matching the big image; "Download all" saves `maketa-restyles.zip` with one image per version, matching the thumbnails; the button is hidden when there is no image.
- [ ] H.5: one card per object with the title "Reference <name>"; the mode switch works; upload, Replace and Remove work with the Part F checks; deleting an object removes its card.
- [ ] H.6: the Room card is first; Clear All removes all photos (room included) and keeps the modes; photos survive switching to Plan and back.
- [ ] H.7: a request with a room photo, two Reference objects and one Creative object passes the server checks; an off-frame object is not sent; a Reference card without a photo turns Creative on Generate; a 9th photo is switched to Creative with the notice; a request over 4 MB is resized or refused with a clear message.
- [ ] H.8: T7, T8, T9, T10 and T1–T3 pass (2 of 3 runs each).
- [ ] No console errors.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL, without the test limits set.

## Backlog
- Part I: "Save the Module": save the camera position together with the room styles, so a view and its results can be kept and reopened.
- Part I: doors and windows (they get reference cards once they exist).
- Export tilt (rotation X and Z). (from Part G)
- Size editing for objects other than the TV. (from Part G)
- From the mock: Snap to wall, Undo, scene toolbar. (from Part G)

## Open questions
- None blocking. Answered 2026-11-02: the Room card is part of H and counts toward the 8 photos; blocked at 6 versions; leaving Personalize asks and clears versions; off-frame objects are skipped; titles use the list name ("Reference Sofa 1"); doors and windows come in Part I; test limit is 20 per visitor locally, public stays 3 per visitor and 20 per day.

## Changelog
- 2026-11-02: Draft created from Julia's outline. Changes to the outline: Reference Room card added to H (was open question 1); leaving Personalize asks and clears versions (replaces "a new Room render does not delete versions"); off-frame objects skipped; `SegmentedSwitch` reused (already in `ui/`); `ReferenceCard` in `panel/` instead of `ui/`; Regenerate rule written down; T10 added for the room photo; doors and windows and "Save the Module" moved to Part I.
- 2026-11-03: H.4: the download button opens a menu: "Download this image" or "Download all" in one ZIP file. Separate files for "all" were tried, but a browser set to ask where to save asks once per file.
