# Restyle prompt

The prompt sent with every Generate (Part F). The live copy is in `api/_restyle-prompt.js` and must match the latest version here.

Images are sent in this order:
1. Image 1: the Room render (1280 × 720 JPEG).
2. Image 2: the reference photo (longest edge 1536 px, JPEG).

Output: 1K, 16:9.

## Versions
- v1 – 2026-10-28: first version; decor rule allows the new sofa and its pillows.

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
