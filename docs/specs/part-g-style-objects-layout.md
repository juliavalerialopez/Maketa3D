# Part G: Soft UI restyle, five new objects, export and import

Status: **Draft**. Builds on Part F (Plan and Personalize, Room render, AI restyle).

## Goal
1. Restyle the editor to the Moss System soft UI, in a light and a dark theme.
2. Add five objects: coffee table, armchair, TV stand with TV, bookshelf, floor lamp.
3. Let the user export the layout to a JSON file and import it back.

## Requirements

### Style reference
- Mock to match: `docs/design/maketa-style-v3.html`.
- Palette (light): ivory `#f5f2ea`, forest `#24533a`, sage `#b9cdb0`, ink `#1c1d1b`.
- Palette (dark): night moss `#18211c`, sage `#b9cdb0`, ivory `#ece8dc`, deep green `#3e5a47`.
- The accent swaps between themes, as in the mock:
  - Light: accent (primary buttons, active tab, selected dot) is forest `#24533a`, with ivory text on it; sage `#b9cdb0` is the soft second color.
  - Dark: accent is sage `#b9cdb0`, with dark text on it (`#15211a`); deep green `#3e5a47` is the soft second color. Background night moss, text ivory `#ece8dc`.
  - Components use the role variables (accent, on-accent, soft), never a palette color by name, so they switch with the theme.
- Font: Outfit, loaded with the Google Fonts `<link>` in `index.html` (the same one the mock uses). Section labels are small, uppercase, letter-spacing about 0.18em. Names and titles are bold.
- Surfaces: raised (soft shadow bottom right, light shadow top left) for cards and buttons; pressed (inset shadow) for fields, the active tab and the selected list item.
- Controls: pill buttons, round minus and plus steppers, pill fields.
- All colors are CSS variables on `:root[data-theme="light"]` and `:root[data-theme="dark"]`. Shared controls change only in `src/components/ui/`.

### Theme
- On first load the theme follows the system setting (`prefers-color-scheme`). With no system preference: light.
- A small switch in the top bar changes it by hand. It uses the mock's pill toggle style (the "Toggles" card: a pressed track with a raised knob), with a sun and a moon icon on either side, and has an accessible label ("Dark theme"). The manual choice is kept in `uiStore` and saved in `localStorage` (reads and writes wrapped in try/catch), so it survives a reload.
- Scene:
  - The page background around the scene and the selection box color (today `#4da3ff`) follow the theme accent.
  - Floor and walls get new soft-UI colors that are **the same in both themes**.
  - The snapshot keeps its white background (`SCENE_BACKGROUND` in `src/components/scene/snapshot.js`).
  - So the Room render sent to the AI is the same in both themes and Part F is unchanged.

### Objects
- Sizes in meters. All objects are built from primitives like the Sofa, with their origin in the middle of the base, standing on the floor, and they fill their size box (used by wall clamping and the selection box).

| Object | Width | Depth | Height | Shape |
|---|---|---|---|---|
| Coffee table | 1.00 | 0.55 | 0.40 | Top slab 4 cm thick plus four legs |
| Armchair | 0.80 | 0.85 | 0.85 | Seat at 0.45, back, two arms |
| Bookshelf | 0.80 | 0.30 | 1.80 | Two sides, top, bottom, four shelves, thin back |
| Floor lamp | 0.36 | 0.36 | 1.70 | Round base, thin pole, shade |
| TV stand with TV | TV width + 0.20 | 0.40 | stand 0.45 + TV | See below |

- Each type is one model file in `src/components/objects/` plus one entry in `catalog.js`. Nothing else defines a type.
- The Objects section shows one "Add <label>" button per catalog type, built from the catalog, so a new type appears without panel changes.
- Every new type has the same selection, move, rotation (including tilt), color, delete and numbering behavior as the Sofa.

### TV stand with TV
- One object. The TV is part of it, not a separate item.
- Extra field in Object details: **Screen size** in inches, whole numbers from 32 to 85, default 55. Stored on the object as `screenInches`.
- TV is 16:9. Width = inches × 0.02214 m. Height = inches × 0.01245 m. A 55 inch TV is about 1.22 m wide and 0.68 m high.
- Stand width = TV width + 0.20 m (0.10 m on each side). Depth 0.40 m and stand height 0.45 m stay fixed. The object's `size` is computed from `screenInches`; the formula lives with the type in the catalog.
- The TV sits centered on the stand with a small base, panel about 5 cm thick, screen on the front face (+z, like the Sofa). Color applies to the stand only; the TV is always black.
- Changing the screen size changes the footprint. The position is then re-clamped with `clampPosition` (`src/store/roomBounds.js`) so the rotated footprint stays inside the walls, the same way a rotation change does, and the selection box follows the new size.

### Export and import
- Export and Import are secondary pill buttons in the top bar, **in Plan only**: an import in Personalize would leave the Room render out of date.
- File name: `maketa-layout.json`. Content:

```json
{
  "version": 1,
  "room": { "width": 4.0, "depth": 3.5, "height": 2.6 },
  "objects": [
    { "type": "sofa", "number": 1, "x": 1.2, "z": 0.8, "rotation": 90, "color": "#3d6e52" },
    { "type": "tvStand", "number": 1, "x": 2.0, "z": 0.3, "rotation": 0, "color": "#d9d2bf", "screenInches": 55 }
  ]
}
```

- `rotation` is the Y rotation in whole degrees, 0–359. Tilt (rotation X and Z) is **not** exported; imported objects have X and Z rotation 0.
- Size is not exported. It comes from the catalog (TV stand: from `screenInches`).
- Export downloads the file straight away. No server. Export is enabled with no objects too (an empty room is a valid layout).
- Import reads a chosen `.json` file and replaces the current room and objects, without asking first (Delete has no confirmation either).
- Invalid file: show a short message, change nothing. Invalid means any of:
  - not JSON, or `version` is not 1
  - room width or depth outside 2–10 m, or height outside 2–4 m (the Room configuration limits)
  - an unknown `type`, or a missing or wrong field (`number` a whole number ≥ 1, `x` and `z` numbers, `rotation` a number, `color` a `#rrggbb` hex)
  - a TV stand without `screenInches` as a whole number from 32 to 85
- Valid file:
  - Positions are clamped inside the walls.
  - The selection is cleared.
  - Per-type numbers continue after the highest imported number, so numbers are never reused.

## Tasks
Tasks are in build order. Each one follows the checkpoint workflow.

- ⬜ G.1 Theme colors and font: named CSS variables per theme replace the ~50 hard-coded colors in `src/index.css`. Outfit font; CSS variables for both themes (background, surface, text, muted, accent, on-accent, soft, shadows; accent forest in light, sage in dark) on `:root[data-theme="light"]` and `:root[data-theme="dark"]`.
- ⬜ G.2 Soft surfaces and shared UI: raised and pressed styles; restyle `Button` (primary and secondary pills), `NumberField` (round minus and plus around a pressed pill value), `ListItem` (selected item pressed with an accent dot); top bar (bold wide title, Plan | Personalize as a pressed pill with a raised active tab); panel sections as raised cards with small uppercase labels.
- ⬜ G.3 Dark theme and switch: system default, pill toggle with sun and moon in the top bar, choice saved.
- ⬜ G.4 Scene colors: page background around the scene and selection box follow the theme; new fixed floor and wall colors; snapshot unchanged.
- ⬜ G.5 Coffee table, and one Add button per catalog type in the Objects section.
- ⬜ G.6 Armchair.
- ⬜ G.7 Bookshelf.
- ⬜ G.8 Floor lamp.
- ⬜ G.9 TV stand with TV and the Screen size field.
- ⬜ G.10 Export layout.
- ⬜ G.11 Import layout.
- ⬜ G.12 Build, deploy, cleanup: `npm run build` on Windows, deploy, check the live site in both themes; update `CLAUDE.md` and the `docs/SPEC.md` roadmap, layout and data model (new objects, `screenInches`, theme, export format).

## Out of scope
The style mock shows a few things that do not exist in the app. They are not part of G:
- "Snap to wall" toggle, Undo button, and the orbit / move / rotate / snapshot toolbar.
- Named layouts, saving layouts in the browser, accounts. (The manual theme choice is the only thing saved in the browser.)
- Editing the size of any object other than the TV (size editing stays in the backlog).
- Any change to Part F (AI restyle).

## Acceptance criteria
- [ ] G.1: switching `data-theme` by hand in dev tools changes the page background, text color and accent (forest in light, sage in dark); the font is Outfit.
- [ ] G.2: the light theme matches the mock for the panel, top bar and Object details. No behavior changed (checked by hand in `npm run dev`; the repo has no tests).
- [ ] G.3: both themes look right in Plan and Personalize; reloading keeps the manual choice; with no manual choice the system setting is used.
- [ ] G.4: the room reads clearly in both themes and the selected object is easy to see; the Room render looks the same in both themes.
- [ ] G.5–G.8: each new object can be added, selected (list and 3D), moved, rotated, tilted, recolored and deleted; the second one is "<label> 2"; numbers are not reused; it clamps at the walls when rotated (bookshelf: 0.80 × 0.30 footprint near a wall).
- [ ] G.9: default 55 inch; 32 and 85 visibly change both the TV and the stand width; the stand is always the TV width + 0.20 m; the position re-clamps; delete and numbering work.
- [ ] G.10: Export downloads `maketa-layout.json` in the format above, with `screenInches` for TV stands.
- [ ] G.11: export, reload, import restores the same room and objects (tilt aside); an invalid file shows a message and leaves the scene untouched; an object added after import gets the next number.
- [ ] Export and Import are shown in Plan only.
- [ ] No console errors.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL, in both themes.

## Backlog
- Saving AI images as alternatives (Part H): each generated image is kept as an option in its own section, so the user can keep several and go back to any of them.
- The restyle prompt assumes one grey box sofa. Other objects in the Room render are not handled by Part F; review in Part H.
- Export tilt (rotation X and Z).
- Size editing for objects other than the TV.
- From the mock: Snap to wall, Undo, scene toolbar.

## Open questions
- None blocking. Decided while drafting: import does not ask before replacing; light is the default with no system preference; Export stays enabled with no objects.

## Changelog
- 2026-10-30: Draft created from Julia's outline. Changes to the outline: export keeps Y rotation only (tilt is lost, stated); floor and walls stay the same in both themes so the AI input is unchanged; Export and Import in Plan only; one Add button per catalog type; extra import checks (room limits, color, screen size); saving AI images as alternatives moved to Part H.
- 2026-10-30: Accent swap from the mock written down (forest in light, sage in dark); theme switch uses the mock's pill toggle with sun and moon.
