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
- v3 – 2026-11-03: v2 plus: the room photo restyles the walls and floor (paneling, moldings included); a reference's own form wins over the grey shape (T11); the camera line asks for a result that lines up with image 1.
- v4 and v5 – 2026-11-03: tried in H.8 and not kept (see v3 Results).
- v6 – candidate, not kept: the I.15 wall-shades line ("Wall shades test").
- v7 – 2026-11-10 (I.18.2): v3 plus the I.18 room-only line before the last line, when there is a room photo and an object photo ("Room reference test").
- v8 – 2026-11-10 (live, I.18.3): v7 plus the plain-walls line after the room-only line, under the same condition ("Room reference test").

## v8 (2026-11-10, live)

Built by `buildPrompt` in `api/_restyle-prompt.js`: the v3 text below, plus, when the request has a room photo and at least one object photo, two lines before the last line: the room-only line (`roomOnlyLine`, v7) and the plain-walls line (`PLAIN_WALLS_LINE`, v8). Both texts are in "Room reference test". Without a room photo or without an object photo, v8 is the same as v3.

## v3 (2026-11-03)

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
Rooms with several pieces fail T3 (the room corner moves to between the pieces) and T11 (a reference's chaise is dropped); see the v3 Results. Idea: give each wall its own clearly different light shade in the Room render, so the corners are easy to see, and tell the model the shades only mark the corners. Candidate **v6**, not kept (v4 and v5 are taken by the H.8 tries): v3 plus this line before the last line (`WALL_SHADES_LINE` in `api/_restyle-prompt.js`, used only by the script):

```text
The walls of image 1 have different light shades only to show where the corners are. Keep every corner exactly where it is, and give all walls the same finish.
```

### Steps (Julia, I.15.1)
1. Put `RESTYLE_MOCK=1` in `.env.local` and start the app with `npx vercel dev`, so the Generate in step 4 only echoes the render (no Gemini call, no counting).
2. Set up one room with several pieces, as in H.8: two sofas (one with a chaise in its reference photo), a coffee table, and a room photo. Move the view so a room corner shows between the pieces and click the plus on Camera 1 to save it. Save the layout (Project menu, Save As, e.g. `shades-test`): the file keeps Camera 1, so both requests below use the same room and camera.
3. Plain walls: switch to Personalize, add the reference photos and press Generate once. In DevTools, Network, open the restyle request, Payload, and save the request body as `scratch/plain-several.json`.
4. Shaded walls: open the app with `?wallShades` at the end of the address (e.g. `http://localhost:3000/?wallShades`; it only works on the dev server, never on the live site), open the saved layout, and repeat step 3, saving `scratch/shades-several.json`. The walls you see now each have their own light tint (back sand, front blue, left sage, right clay; two show, the walls on the camera's side are hidden). If they still look like the normal ivory walls, the switch is off: check that `?wallShades` is in the address and that the page is the local dev server.
5. Remove `RESTYLE_MOCK=1` again. Run each case 3 times (3 paid images per command, 9 in all). One request covers T3 and T11, and the same images are checked for the other tests:
   - plain walls, live prompt: `node --env-file=.env.local scripts/try-restyle.mjs scratch/plain-several.json`
   - shaded walls, live prompt: `node --env-file=.env.local scripts/try-restyle.mjs scratch/shades-several.json`
   - shaded walls, live prompt plus the v6 line: `node --env-file=.env.local scripts/try-restyle.mjs scratch/shades-several.json --shades`
   The results are in `scratch/restyle-runs/`. Written for v3; the script always uses the live prompt (v8 since I.18.3), so the names say `v8` (the v6 runs end in `-v8-shades`), and a request with a room photo and an object photo also gets the room-only and plain-walls lines.
6. Fill in the table below. T3 passes when the corner stays where it is in the render; T11 when the chaise is kept; the others as in the Part F and Part H specs. The pass rule is 2 of 3 runs.

### Results
| Test | v3, plain walls | v3, shaded walls | v6 (`--shades`), shaded walls |
|---|---|---|---|
| T3 room shape kept, several pieces | | | |
| T11 reference form kept, several pieces | | | |
| T1, T2 (Part F) | | | |
| T7 to T10 (Part H) | | | |

For reference, H.8 with the old render (before I.13 and I.14): T3 0/3, T11 1/3.

Decision (Julia, 2026-11-10, I.15.1): not kept. With the shaded walls (I.15.2 tints) Julia saw no improvement, so the scripted runs above were not done. The walls keep their one color, v6 is not used, and "another model" stays in the Part I Backlog. The `?wallShades` switch and `--shades` option stay, for a later try.

## Room reference test (Part I, I.18)
Julia, 2026-11-10: when an object photo is strong (its own room has bold walls or floor), the result takes the walls and floor from that photo and ignores the room photo. v3 says once per object photo to ignore its walls and floor, but T10 was only tested with mild object photos. New test **T12**: with a room photo and an object photo whose background is a clearly different, strong room, the walls, floor and light follow the room photo, and the object still follows its own photo.

**v7** (I.18.2): v3 plus this line before the last line (`roomOnlyLine` in `api/_restyle-prompt.js`). It is added only when there is a room photo and at least one object photo; the image numbers follow the request (here with two object photos):

```text
Only image 2 sets the walls, floor and light. Images 3 and 4 are for the furniture only: take no wall color, wall finish, floor, rug or light from them, even when they show a strong room.
```

**v8** (live since I.18.3): v7 plus this line after it, under the same condition (`PLAIN_WALLS_LINE`):

```text
If image 2 has plain walls, keep them plain: take no paneling, wainscoting or moldings from the other images.
```

### Steps (Julia, I.18.1)
1. Choose two photos that clearly disagree: a room photo with light walls and a light floor (e.g. white walls, pale wood), and a sofa photo taken in a strong room (e.g. dark green or deep red walls, dark floor).
2. Put `RESTYLE_MOCK=1` in `.env.local` and start the app with `npx vercel dev` (normal walls, no `?wallShades`). In Plan, add one sofa and one coffee table, move the view so both show, and click the plus on Camera 1 to save it.
3. Switch to Personalize. Upload the sofa photo on the sofa's card and the room photo on the Room card, and leave the coffee table on Creative. Press Generate once, and in DevTools, Network, save the restyle request body as `scratch/room-vs-object.json`.
4. Remove `RESTYLE_MOCK=1` again. Each command makes 3 paid images:
   - T12, v3: done on 2026-11-10, before v7 went live (the script then still used v3).
   - T12, v7 (I.18.2): `node --env-file=.env.local scripts/try-restyle.mjs scratch/room-vs-object.json`
   - Optional, other tests with v7: `node --env-file=.env.local scripts/try-restyle.mjs scratch/plain-several.json` (the plain-walls request from the "Wall shades test" steps 2 and 3). This only adds the line if that request has a room photo and an object photo.
   The v7 images are named `<time>-<case>-v7-<run>.png` (or `.jpg`) in `scratch/restyle-runs/`. Since I.18.3 these commands run v8, named `-v8-`.
5. Fill in the table below. Pass rule: 2 of 3 runs.

### Results
| Test | v3 | v7 |
|---|---|---|
| T12 room photo wins over a strong object photo | 3/3 | 3/3 |
| T7 to T11 (Part H), several pieces | not run | not run |
| T1, T2, T3 (Part F), several pieces | not run | not run |

2026-11-10, `scratch/room-vs-object.json`: room photo of an empty room (light greige walls, white baseboards, beige carpet); Sofa 1 photo of a floral sofa in a room with deep burgundy walls, a jute rug, gold tables and decor; Coffee table 1 Creative. Scored by Claude. v3: all 3 runs have the greige walls and the carpet, the floral sofa with its pillows, and nothing from the sofa photo's room. Outside T12: run 1 added a side wall on the left (T3), run 3 turned the sofa slightly (T1).

2026-11-10, v7 (I.18.2), same request, run by Claude and scored by Claude: all 3 runs have the light walls and the beige carpet, the floral sofa with its pillows facing the camera, a wooden coffee table, and nothing from the sofa photo's room (no burgundy, jute rug or gold decor). Outside T12: run 2 shows more of the left wall and adds a sunlight patch; the pillows vary a little between runs.

Decision (Julia, 2026-11-10, I.18.1 and I.18.2): v7 goes live. v3 passed T12 here, but Julia has seen a strong object photo override the room photo in the app, and that case could not be repeated. The extra line repeats the v3 rule, so it should not hurt. Julia only ran T12 with v3; the other v3 and v7 runs were not done. The check for I.18.2, T12 with v7 (step 4), passed 3 of 3. If other results get worse later, go back to v3.

### Simple corner (I.18.3)
Julia, 2026-11-10: on the live site (v7 just deployed; it may still have been v3), the "simple corner" room took the sofa photo's grey-blue wainscoting and a wood floor. Saved from the app as `scratch/simple-corner.json`: room photo of an empty room (plain light walls, white baseboards, beige carpet); Sofa 1 photo of a light-blue tufted sectional in a room with grey-blue wainscoting, a green rug and art; Bookshelf 1 photo of a sage-green shelf against grey-green walls; Coffee table 1, Floor lamp 1 and TV stand 1 Creative. In the Room render the TV stand stands against the right wall and the TV faces the camera. Run by Claude with `--runs 6` (v8 as the `--plain-walls` option while it was a candidate), scored by Claude.

| Check | v7 (6 runs) | v8 (6 runs) |
|---|---|---|
| T12 walls and floor from the room photo | 5/6 (one run copied the sofa photo's wainscoting; carpet 6/6) | 6/6 |
| TV stand faces as in the render (T1) | 2/6 (turned toward the sofa or seen from the back) | 5/6 |
| Bookshelf and sofa from their photos (T7, T8) | 6/6 | 6/6 |

Outside these: v8 runs 1 and 5 keep the white area above the walls (no ceiling), as in the render; v8 run 2 moves the coffee table to the right. The TV result may be chance; I.19 works on it directly.

Decision (Julia, 2026-11-10, I.18.3): v8 goes live (the spec rule: 6 of 6 plain walls, nothing worse).

## Test cases
See `docs/specs/part-f-restyle.md` (T1 to T6, pass rule: at least 2 of 3 runs on all three fixtures).
