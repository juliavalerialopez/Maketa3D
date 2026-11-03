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
- v2 – 2026-11-03: built per request (H.7): a room part (reference photo or creative) and one line per object with its list name, its position in image 1 (percent from the left and top) and its reference image or creative rule. Draft: to be tested in H.8 (T7–T10, T1–T3).

## v2 (2026-11-03, draft)

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
Not tested yet (H.8).

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

## Test cases
See `docs/specs/part-f-restyle.md` (T1 to T6, pass rule: at least 2 of 3 runs on all three fixtures).
