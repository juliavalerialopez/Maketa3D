import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { importLayout, layoutData, newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { useRoomStore } from '../src/store/roomStore.js'
import { tvStandSize } from '../src/components/objects/tvStandSize.js'
import { DEFAULT_CAMERA, useCameraStore } from '../src/store/cameraStore.js'

const layout = {
  version: 1,
  room: { width: 4, depth: 3.5, height: 2.6 },
  camera: { x: -1.5, y: 1.4, z: 1.2, pan: 135, tilt: -10.5, fov: 45 },
  objects: [
    { type: 'sofa', number: 2, x: 0.5, z: -0.3, rotation: 90, color: '#112233', hidden: true },
    { type: 'tvStand', number: 5, x: 0, z: 1, rotation: 0, color: '#d9d2bf', screenInches: 55 },
  ],
}
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

test('a file without a camera (saved before Part I) opens with the default camera', () => {
  const { camera: _camera, ...older } = layout
  useCameraStore.getState().updateCamera({ fov: 30 })
  assert.equal(importLayout(text(older)), true)
  assert.deepEqual(useCameraStore.getState().camera, DEFAULT_CAMERA)
})

test('the camera is saved and opened again', () => {
  importLayout(text(layout))
  const camera = useCameraStore.getState().camera
  assert.deepEqual(camera.position, [-1.5, 1.4, 1.2])
  close(camera.pan, (135 * Math.PI) / 180)
  close(camera.tilt, (-10.5 * Math.PI) / 180)
  assert.equal(camera.fov, 45)
  assert.deepEqual(layoutData().camera, layout.camera)
})

test('a camera outside its limits makes the file invalid', () => {
  for (const camera of [{ ...layout.camera, tilt: 120 }, { ...layout.camera, fov: 5 }, { ...layout.camera, y: 'high' }]) {
    assert.equal(importLayout(text({ ...layout, camera })), false)
  }
})

test('New Project puts the camera back at its start', () => {
  importLayout(text(layout))
  newLayout()
  assert.deepEqual(useCameraStore.getState().camera, DEFAULT_CAMERA)
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
  ]
  for (const file of invalid) assert.equal(importLayout(file), false, file)
  assert.deepEqual(layoutData(), before)
  assert.deepEqual(useRoomStore.getState().room, layout.room)
})
