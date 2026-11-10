# Restyle prompt

The prompt sent with every Generate (Part F, Part H). The live copy is in `api/_restyle-prompt.js` and must match the latest version here.

Images are sent in this order (v2):
1. Image 1: the Room render (1280 × 720 JPEG).
2. Then the room photo, if the Reference Room card is in Reference mode.
3. Then one photo per object in Reference mode, in the Objects list order.

Photos: longest edge 1024 px, JPEG (v1: 1536 px). At most 8 photos, the room's included.

Output: 1K, 16:9.

## Versions
- v1 – 2026-10-28: first version; decor rule allows the new sofa and its pillows.
- v2 – 2026-11-03: built per request (H.7): a room part (reference photo or creative) and one line per object with its list name, its position in image 1 (percent from the left and top) and its reference image or creative rule. Tested in H.8: T10 and T3 failed.
- v3 – 2026-11-03 (live): v2 plus: the room photo restyles the walls and floor (paneling, moldings included); a reference's own form wins over the grey shape (T11); the camera line asks for a result that lines up with image 1.
- v4 and v5 – 2026-11-03: tried in H.8 and not kept (see v3 Results).

## v3 (2026-11-03, live)

Built by `buildPrompt` in `api/_restyle-prompt.js`. Parts in `<...>` are filled per request; image numbers count up from 2 in the order above.

```text
Edit image 1. It is a plain 3D render of a room. The grey box shapes in it are placeholder furniture.
Make image 1 look like a real photograph of the same room, with real furniture in place of the grey shapes.

Keep exactly as in image 1:
- The camera: same viewpoint, height, angle, lens and framing. Do not rotate, zoom or move the view. The result must line up with image 1 when laid over it: every wall corner and floor edge stays at the same place in the frame.
- The room's shape: the same walls, corners and floor edges. Do not add windows, doors, beams, baseboards or openings.
- Every piece of furniture listed below: the same place on the floor, about the same size, and the same orientation as its grey shape. Each must be seen from the same side and at the same angle. Do not turn any piece to face the camera.

The grey shapes only mark where each piece stands, how big it is and which way it faces; they are not its design. A piece with a reference photo takes its form from that photo, even when it differs from the grey shape (for example a round table on a rectangular shape, or a sofa with a chaise on a straight shape).

The room (walls, floor, light):
<room reference:>
Image <n> is the room reference. Restyle the walls and floor of image 1 to match it: the wall color, the wall finish with any paneling, wainscoting or moldings, the floor material and color, the light, the time of day and the mood.
These replace the plain grey walls and floor of image 1; only their shape and position stay.
Ignore all furniture, objects and decor in image <n>.
<room creative:>
Choose a wall color and finish, a floor material and a light that suit the furniture below.

The furniture:
<per object, in list order:>
- <Name> (<a/an kind>): its grey shape is centered at <x>% from the left and <y>% from the top of image 1.
<reference:>
  Image <n> is its reference. Replace the grey shape with the <kind> from image <n> only, in its own form: its outline (round, square, L-shaped, with or without a chaise), arms, legs, fabric or material and color. Do not reshape it to fit the grey shape.
  Ignore everything else in image <n>: other furniture, walls, floor, plants and decor.
<creative:>
  No reference: replace the grey shape with a realistic <kind> in a style that fits the room and the other pieces.

Do not add anything else: no plants, rugs, shelves, wall slats, beams, artwork, lamps, tables, chairs or other furniture. Every object in the result must be one of the pieces listed above.

Output one photorealistic 16:9 image.
```

### Results
2026-11-03, `scripts/try-restyle.mjs` with requests saved from the app, 3 runs each, scored by Claude from the images and checked by Julia.

Case 1: Sofa 1 (green leather sofa with a chaise; its photo also shows nesting tables, a plant, a lamp and a rug), Sofa 2 (floral sofa; its photo also shows tables and lamps), Coffee table 1 Creative, and a room photo (grey-green wainscoting, with its own sofa). Default-like camera; the wall corner is at about 15% from the left.

Case 2: one sofa (the green chaise photo), room Creative; the wall corner is at about 22% from the left.

| Test | v2, case 1 | v3, case 1 | v3, case 2 |
|---|---|---|---|
| T7 only the named item | 3/3 | 3/3 | 3/3 |
| T8 right photo per sofa | 3/3 | 3/3 | – |
| T9 Creative table | 3/3 | 3/3 | – |
| T10 room photo sets walls, floor, light | 0/3 (plain walls) | 3/3 (wainscoting) | – |
| T11 reference form kept (chaise) | 0/3 | 1/3 | 3/3 |
| T1 angle kept | 3/3 | 3/3 | 3/3 |
| T2 no added decor | 3/3 | 3/3 | 3/3 |
| T3 room shape kept | 0/3 | 0/3 | 3/3 |

With several pieces the model moves the room corner to between them (to 35–50% from the left) and often drops the chaise. With one piece it keeps both. Accepted as a known limitation (Part H Backlog).

Tried and not kept:
- **v4** (v3 plus a line naming "the faint vertical line where two grey walls meet" and asking to keep it, and "keep that form even if it reaches past the grey shape"): T3 1/3, T11 1/3, and worse elsewhere (T8 2/3: sofas swapped once; T10 1/3: cream paneling; T2 2/3: a book added).
- **v5** (v3 plus the exact corner line from the app, "a vertical line from 13.7% from the left and 44.7% from the top up to 16% from the left and 0% from the top"; H.8.1): T3 0/3 (corner at 32–49%), T11 0/3. Code removed.
- **v3 with a dark line drawn on the corner** in the render (by hand, to test a clearer render): T3 1/3 (one run close, but with an extra corner added), T11 2/3.

Not tested: 8 photos in one request (the most tested was 3 photos, 4 images).

## v2 (2026-11-03)

Built by `buildPrompt` in `api/_restyle-prompt.js`. Parts in `<...>` are filled per request; image numbers count up from 2 in the order above.

```text
Edit image 1. It is a plain 3D render of a room. The grey box shapes in it are placeholder furniture.
Make image 1 look like a real photograph of the same room, with real furniture in place of the grey shapes.

Keep exactly as in image 1:
- The camera: same viewpoint, height, angle, lens and framing. Do not rotate, zoom or move the view.
- The room: the same walls, corners and floor edges in the same places. Do not add windows, doors, beams, baseboards or openings.
- Every piece of furniture listed below: the same place on the floor, the same size and the same orientation as its grey shape. Each must be seen from the same side and at the same angle. Do not turn any piece to face the camera.

The room (walls, floor, light):
<room reference:>
Image <n> is the room reference. Take only the wall color and finish, the floor material, the light, the time of day and the mood from it.
Ignore all furniture, objects and decor in image <n>.
<room creative:>
Choose a wall color and finish, a floor material and a light that suit the furniture below.

The furniture:
<per object, in list order:>
- <Name> (<a/an kind>): its grey shape is centered at <x>% from the left and <y>% from the top of image 1.
<reference:>
  Image <n> is its reference. Replace the grey shape with the <kind> from image <n> only: its design, shape, legs, fabric or material and color.
  Ignore everything else in image <n>: other furniture, walls, floor, plants and decor.
<creative:>
  No reference: replace the grey shape with a realistic <kind> in a style that fits the room and the other pieces.

Do not add anything else: no plants, rugs, shelves, wall slats, beams, artwork, lamps, tables, chairs or other furniture. Every object in the result must be one of the pieces listed above.

Output one photorealistic 16:9 image.
```

### Results
Tested in H.8, see the v3 Results.

## v1 (2026-10-28)

```text
Edit image 1. It is a plain 3D render of a room with one grey box-shaped sofa. Image 2 is a reference photo.
Make image 1 look like a real photograph of the same room, restyled to match image 2.

Keep exactly as in image 1:
- The camera: same viewpoint, height, angle, lens and framing. Do not rotate, zoom or move the view.
- The room: the same walls, corners and floor edges in the same places. Do not add windows, doors, beams, baseboards or openings.
- The sofa: the same place on the floor and the same orientation. It must be seen from the same side and at the same angle as the grey sofa. Do not turn it to face the camera.

Take from image 2:
- The sofa's design: shape, arms, legs, cushions, fabric, color and the pillows on it. Its size may follow the sofa in image 2, centered where the grey sofa is.
- The room's style: wall color and finish, floor material, light, time of day and mood.

Do not add anything else: no plants, rugs, shelves, wall slats, beams, artwork, lamps, tables, chairs or other furniture. Every object in the result must already be in image 1, except the sofa and the pillows on it.

Output one photorealistic 16:9 image.
```

### Results
2026-10-30: checked by hand in the app on the three fixture views with `reference-couch.jpg`: works (sofa angle, no added decor, room shape kept). No scripted runs (F.1.3 skipped).

## T6 experiment: white area outside the room
The Room render hides the camera-facing walls, so the area outside the room is plain white. F.1.3 runs every fixture with v1 as is, and with this line added before the last line:

```text
The white area outside the room is empty background; keep it plain.
```

| Fixture | Without the line | With the line |
|---|---|---|
| fixture-1-corner.png | | |
| fixture-2-side.png | | |
| fixture-3-rotated.png | | |

Decision: not tested (F.1.3 skipped). v1 stays without the line unless a problem shows up.

## Wall shades test (Part I, I.15)
Rooms with several pieces fail T3 (the room corner moves to between the pieces) and T11 (a reference's chaise is dropped); see the v3 Results. Idea: give each wall its own clearly different light shade in the Room render, so the corners are easy to see, and tell the model the shades only mark the corners. Candidate **v6** (v4 and v5 are taken by the H.8 tries): v3 plus this line before the last line (`WALL_SHADES_LINE` in `api/_restyle-prompt.js`, used only by the script):

```text
The walls of image 1 have different light shades only to show where the corners are. Keep every corner exactly where it is, and give all walls the same finish.
```

### Steps (Julia, I.15.1)
1. Put `RESTYLE_MOCK=1` in `.env.local` and start the app with `npx vercel dev`, so the Generate in step 4 only echoes the render (no Gemini call, no counting).
2. Set up one room with several pieces, as in H.8: two sofas (one with a chaise in its reference photo), a coffee table, and a room photo. Move the view so a room corner shows between the pieces and click the plus on Camera 1 to save it. Save the layout (Project menu, Save As, e.g. `shades-test`): the file keeps Camera 1, so both requests below use the same room and camera.
3. Plain walls: switch to Personalize, add the reference photos and press Generate once. In DevTools, Network, open the restyle request, Payload, and save the request body as `scratch/plain-several.json`.
4. Shaded walls: open the app with `?wallShades` at the end of the address (e.g. `http://localhost:3000/?wallShades`; it only works on the dev server, never on the live site), open the saved layout, and repeat step 3, saving `scratch/shades-several.json`. The walls you see now each have their own light tint (back sand, front blue, left sage, right clay; two show, the walls on the camera's side are hidden). If they still look like the normal ivory walls, the switch is off: check that `?wallShades` is in the address and that the page is the local dev server.
5. Remove `RESTYLE_MOCK=1` again. Run each case 3 times (3 paid images per command, 9 in all). One request covers T3 and T11, and the same images are checked for the other tests:
   - plain walls, v3: `node --env-file=.env.local scripts/try-restyle.mjs scratch/plain-several.json`
   - shaded walls, v3: `node --env-file=.env.local scripts/try-restyle.mjs scratch/shades-several.json`
   - shaded walls, v6 (v3 plus the line): `node --env-file=.env.local scripts/try-restyle.mjs scratch/shades-several.json --shades`
   The results are in `scratch/restyle-runs/`; the v6 runs end in `-v3-shades`.
6. Fill in the table below. T3 passes when the corner stays where it is in the render; T11 when the chaise is kept; the others as in the Part F and Part H specs. The pass rule is 2 of 3 runs.

### Results
| Test | v3, plain walls | v3, shaded walls | v6 (`--shades`), shaded walls |
|---|---|---|---|
| T3 room shape kept, several pieces | | | |
| T11 reference form kept, several pieces | | | |
| T1, T2 (Part F) | | | |
| T7 to T10 (Part H) | | | |

For reference, H.8 with the old render (before I.13 and I.14): T3 0/3, T11 1/3.

Decision: open (I.15.1). Keep the shades (as the default wall colors) and v6 only if T3 or T11 improve without making T1, T2 or T7 to T10 worse. Otherwise nothing changes, and "another model" stays in the Part I Backlog.

## Test cases
See `docs/specs/part-f-restyle.md` (T1 to T6, pass rule: at least 2 of 3 runs on all three fixtures).
