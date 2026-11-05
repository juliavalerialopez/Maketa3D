import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { useRoomStore } from '../src/store/roomStore.js'
import { beginGesture, endGesture, useHistoryStore } from '../src/store/historyStore.js'
import { useRestyleStore } from '../src/store/restyleStore.js'
import { DEFAULT_CAMERA, useCameraStore } from '../src/store/cameraStore.js'

const objects = () => useObjectsStore.getState().objects
const history = () => useHistoryStore.getState()
const addSofa = () => {
  useObjectsStore.getState().addObject('sofa')
  return objects().at(-1)
}
const moveTo = (id, x) => useObjectsStore.getState().updateObject(id, { position: [x, 0, 0] })

beforeEach(() => newLayout())

test('a new project starts with nothing to undo or redo', () => {
  assert.equal(history().past.length, 0)
  assert.equal(history().future.length, 0)
})

test('undo and redo an Add', () => {
  const sofa = addSofa()
  history().undo()
  assert.equal(objects().length, 0)
  history().redo()
  assert.deepEqual(objects(), [sofa])
})

test('a whole drag is one step', () => {
  const sofa = addSofa()
  beginGesture()
  for (const x of [0.5, 1, 1.5, 2]) moveTo(sofa.id, x)
  endGesture()
  assert.equal(history().past.length, 2) // the Add and the drag
  history().undo()
  assert.deepEqual(objects()[0].position, sofa.position)
  history().redo()
  assert.deepEqual(objects()[0].position, [2, 0, 0])
})

test('a gesture that changes nothing is not a step', () => {
  addSofa()
  beginGesture()
  endGesture()
  assert.equal(history().past.length, 1)
})

test('a room size and the clamp it causes undo in one step', () => {
  const sofa = addSofa()
  moveTo(sofa.id, 2.5)
  beginGesture()
  useRoomStore.getState().setRoomSize({ width: 3 })
  useObjectsStore.getState().fitToRoom(useRoomStore.getState().room)
  endGesture()
  assert.deepEqual(objects()[0].position, [0.5, 0, 0])
  history().undo()
  assert.equal(useRoomStore.getState().room.width, 6)
  assert.deepEqual(objects()[0].position, [2.5, 0, 0])
})

test('a new change after an undo clears the redo steps', () => {
  const sofa = addSofa()
  moveTo(sofa.id, 1)
  history().undo()
  assert.equal(history().future.length, 1)
  moveTo(sofa.id, 2)
  assert.equal(history().future.length, 0)
})

test('an undone Delete brings the object back with its name and its photo', () => {
  const sofa = addSofa()
  useRestyleStore.getState().setReferenceMode(sofa.id, 'creative')
  useObjectsStore.getState().removeObject(sofa.id)
  assert.ok(useRestyleStore.getState().references[sofa.id], 'kept while the Delete can be undone')
  history().undo()
  assert.deepEqual(objects(), [sofa])
  assert.equal(useRestyleStore.getState().references[sofa.id].mode, 'creative')
})

test('a deleted object loses its reference once the history is cleared', () => {
  const sofa = addSofa()
  useRestyleStore.getState().setReferenceMode(sofa.id, 'creative')
  useObjectsStore.getState().removeObject(sofa.id)
  newLayout()
  assert.equal(useRestyleStore.getState().references[sofa.id], undefined)
})

test('the selection is cleared when the selected object is undone away', () => {
  const sofa = addSofa()
  useObjectsStore.getState().selectObject(sofa.id)
  history().undo()
  assert.equal(useObjectsStore.getState().selectedId, null)
})

test('numbers are not reused after an undone Add', () => {
  addSofa()
  history().undo()
  assert.equal(addSofa().number, 2)
})

test('undo and redo wait while a gesture is in progress', () => {
  const sofa = addSofa()
  beginGesture()
  moveTo(sofa.id, 2)
  history().undo()
  assert.deepEqual(objects()[0].position, [2, 0, 0])
  moveTo(sofa.id, 3)
  endGesture()
  assert.equal(history().past.length, 2) // the Add and the whole drag
  history().undo()
  assert.deepEqual(objects()[0].position, sofa.position)
})

test('redo waits while a gesture is in progress', () => {
  const sofa = addSofa()
  moveTo(sofa.id, 1)
  history().undo()
  beginGesture()
  history().redo()
  assert.deepEqual(objects()[0].position, sofa.position)
  endGesture()
  history().redo()
  assert.deepEqual(objects()[0].position, [1, 0, 0])
})

test('overlapping gestures (a focused field, then a drag) make one step', () => {
  const sofa = addSofa()
  beginGesture() // the field gets focus
  beginGesture() // a 3D drag starts
  endGesture() // the field blurs
  for (const x of [0.5, 1, 1.5]) moveTo(sofa.id, x)
  endGesture() // the drag ends
  assert.equal(history().past.length, 2) // the Add and one step for the drag
  history().undo()
  assert.deepEqual(objects()[0].position, sofa.position)
})

test('an extra endGesture does nothing', () => {
  addSofa()
  endGesture()
  beginGesture()
  endGesture()
  endGesture()
  assert.equal(history().past.length, 1)
})

test('a camera change is one step and undoes', () => {
  beginGesture()
  useCameraStore.getState().updateCamera({ position: [1, 1.5, 2] })
  useCameraStore.getState().updateCamera({ fov: 35 })
  endGesture()
  assert.equal(history().past.length, 1)
  history().undo()
  assert.deepEqual(useCameraStore.getState().camera, DEFAULT_CAMERA)
  history().redo()
  assert.equal(useCameraStore.getState().camera.fov, 35)
})

test('the camera stays selected through undo and redo', () => {
  useObjectsStore.getState().selectObject('camera')
  useCameraStore.getState().updateCamera({ fov: 35 })
  history().undo()
  assert.equal(useObjectsStore.getState().selectedId, 'camera')
  history().redo()
  assert.equal(useObjectsStore.getState().selectedId, 'camera')
})

test('at most 50 steps are kept', () => {
  const sofa = addSofa()
  for (let index = 1; index <= 60; index++) moveTo(sofa.id, index / 100)
  assert.equal(history().past.length, 50)
})
