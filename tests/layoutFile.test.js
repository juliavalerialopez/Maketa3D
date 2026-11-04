import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { importLayout, layoutData, newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { useRoomStore } from '../src/store/roomStore.js'
import { tvStandSize } from '../src/components/objects/tvStandSize.js'

const layout = {
  version: 1,
  room: { width: 4, depth: 3.5, height: 2.6 },
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
