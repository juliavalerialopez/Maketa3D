import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { importLayout, layoutData, newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { useRoomStore } from '../src/store/roomStore.js'
import { useCameraSlotsStore } from '../src/store/cameraSlotsStore.js'
import { tvStandSize } from '../src/components/objects/tvStandSize.js'

const camera = { x: 3, y: 2.5, z: 4, targetX: 0, targetY: 0.5, targetZ: 0, fov: 48.5 }
const layout = {
  version: 1,
  room: { width: 4, depth: 3.5, height: 2.6 },
  objects: [
    { type: 'sofa', number: 2, x: 0.5, z: -0.3, rotation: 90, color: '#112233', hidden: true },
    { type: 'tvStand', number: 5, x: 0, z: 1, rotation: 0, color: '#d9d2bf', screenInches: 55 },
  ],
  cameras: [null, camera, null],
}
const slots = () => useCameraSlotsStore.getState().slots
const text = (data) => JSON.stringify(data)
const objects = () => useObjectsStore.getState().objects
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

beforeEach(() => newLayout())

test('save then open restores the room and the objects', () => {
  const { addObject, updateObject, setHidden } = useObjectsStore.getState()
  useRoomStore.getState().setRoomSize({ width: 5, depth: 4 })
  addObject('sofa')
  addObject('tvStand')
  const [sofa, tv] = objects()
  updateObject(sofa.id, { position: [1, 0, -0.5], rotation: [0, Math.PI / 2, 0], color: '#123456' })
  updateObject(tv.id, { screenInches: 40, size: tvStandSize(40) })
  setHidden(sofa.id, true)

  const saved = text(layoutData())
  newLayout()
  assert.equal(importLayout(saved), true)

  assert.deepEqual(useRoomStore.getState().room, { width: 5, depth: 4, height: 2.6 })
  const [openedSofa, openedTv] = objects()
  assert.deepEqual(openedSofa.position, [1, 0, -0.5])
  close(openedSofa.rotation[1], Math.PI / 2)
  assert.equal(openedSofa.color, '#123456')
  assert.equal(openedSofa.hidden, true)
  assert.equal(openedTv.screenInches, 40)
  assert.deepEqual(openedTv.size, tvStandSize(40))
  assert.equal(openedTv.hidden, undefined)
})

test('rotations are saved as whole degrees from 0 to 359', () => {
  const turned = (rotation) => ({ ...layout, objects: [{ ...layout.objects[0], rotation }] })
  importLayout(text(turned(-90)))
  assert.equal(layoutData().objects[0].rotation, 270)
  importLayout(text(turned(450)))
  assert.equal(layoutData().objects[0].rotation, 90)
  const [sofa] = objects()
  useObjectsStore.getState().updateObject(sofa.id, { rotation: [0, (359.6 * Math.PI) / 180, 0] })
  assert.equal(layoutData().objects[0].rotation, 0)
})

test('open then save gives the same file', () => {
  assert.equal(importLayout(text(layout)), true)
  assert.deepEqual(layoutData(), layout)
})

test('numbering continues per type after the highest imported number', () => {
  importLayout(text(layout))
  const { addObject } = useObjectsStore.getState()
  addObject('sofa')
  addObject('tvStand')
  addObject('armchair')
  assert.deepEqual(
    objects().slice(-3).map((object) => object.number),
    [3, 6, 1],
  )
})

test('an imported position outside the walls is clamped', () => {
  const outside = { ...layout, objects: [{ type: 'sofa', number: 1, x: 10, z: 0, rotation: 0, color: '#112233' }] }
  importLayout(text(outside))
  assert.deepEqual(objects()[0].position, [1, 0, 0])
})

test('invalid files are refused and change nothing', () => {
  importLayout(text(layout))
  const before = layoutData()
  const invalid = [
    'not json',
    text({ ...layout, version: 2 }),
    text({ ...layout, room: { width: 20, depth: 3.5, height: 2.6 } }),
    text({ ...layout, objects: [{ ...layout.objects[0], type: 'piano' }] }),
    text({ ...layout, objects: [{ ...layout.objects[1], screenInches: 100 }] }),
    text({ ...layout, objects: [{ ...layout.objects[0], color: 'red' }] }),
    text({ ...layout, cameras: [camera] }),
    text({ ...layout, cameras: [null, { ...camera, fov: 180 }, null] }),
    text({ ...layout, cameras: [null, { ...camera, y: 'high' }, null] }),
    text({ ...layout, cameras: [null, { ...camera, x: 0, y: 0.5, z: 0 }, null] }),
  ]
  for (const file of invalid) assert.equal(importLayout(file), false, file)
  assert.deepEqual(layoutData(), before)
  assert.deepEqual(useRoomStore.getState().room, layout.room)
})

test('camera slots are saved and opened again, without thumbnails', () => {
  useCameraSlotsStore.getState().saveSlot(0, {
    view: { position: [1.23456, 2, 3], target: [0, 0.5, 0], fov: 50.123 },
    thumbnail: 'data:image/jpeg;base64,AA',
  })
  const saved = layoutData()
  assert.deepEqual(saved.cameras, [{ x: 1.235, y: 2, z: 3, targetX: 0, targetY: 0.5, targetZ: 0, fov: 50.12 }, null, null])

  newLayout()
  importLayout(text(saved))
  assert.deepEqual(slots(), [{ view: { position: [1.235, 2, 3], target: [0, 0.5, 0], fov: 50.12 }, thumbnail: null }, null, null])
  assert.equal(useCameraSlotsStore.getState().activeSlot, null)
})

test('a file without cameras, or with the old single camera, opens with empty slots', () => {
  importLayout(text(layout))
  const older = { ...layout, camera: { x: 1, y: 1, z: 1 } }
  delete older.cameras
  assert.equal(importLayout(text(older)), true)
  assert.deepEqual(slots(), [null, null, null])
  assert.deepEqual(layoutData().cameras, [null, null, null])
})

test('a new project empties the camera slots', () => {
  importLayout(text(layout))
  assert.notEqual(slots()[1], null)
  newLayout()
  assert.deepEqual(slots(), [null, null, null])
})
