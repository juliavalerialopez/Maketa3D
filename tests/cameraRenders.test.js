import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { selectRoomRender, useModeStore } from '../src/store/modeStore.js'
import { useRestyleStore } from '../src/store/restyleStore.js'

const mode = () => useModeStore.getState()
const restyle = () => useRestyleStore.getState()
const render = (name) => ({ image: `data:image/png;base64,${name}`, objects: [], view: null })
const version = (id, slot) => ({ id, number: 1, image: 'data:image/png;base64,AI', roomRender: render(slot).image, slot, createdAt: 0 })

beforeEach(() => {
  mode().setRoomRenders([render(0), null, render(2)], 2)
  useRestyleStore.setState({ versions: [], selectedVersionId: null })
})

test('the Camera menu starts on the active slot', () => {
  assert.equal(mode().renderSlot, 2)
  assert.deepEqual(selectRoomRender(mode()), render(2))
})

test('without an active slot with a render, it starts on the first render', () => {
  mode().setRoomRenders([null, render(1), render(2)], null)
  assert.equal(mode().renderSlot, 1)
  mode().setRoomRenders([null, render(1), render(2)], 0)
  assert.equal(mode().renderSlot, 1)
})

test('with no render there is no camera and no Room render', () => {
  mode().setRoomRenders([null, null, null], 0)
  assert.equal(mode().renderSlot, null)
  assert.equal(selectRoomRender(mode()), null)
})

test('choosing another camera shows its render and deselects the version, keeping the versions', () => {
  useRestyleStore.setState({ versions: [version('a', 2)], selectedVersionId: 'a' })
  restyle().chooseCamera(0)
  assert.equal(mode().renderSlot, 0)
  assert.equal(restyle().selectedVersionId, null)
  assert.equal(restyle().versions.length, 1)
})

test('choosing the same camera, or one without a render, changes nothing', () => {
  useRestyleStore.setState({ versions: [version('a', 2)], selectedVersionId: 'a' })
  restyle().chooseCamera(2)
  restyle().chooseCamera(1)
  assert.equal(mode().renderSlot, 2)
  assert.equal(restyle().selectedVersionId, 'a')
})

test('selecting a version switches to its camera', () => {
  useRestyleStore.setState({ versions: [version('a', 0), version('b', 2)] })
  restyle().selectVersion('a')
  assert.equal(mode().renderSlot, 0)
})

test('deleting the shown version shows the next one and its camera', () => {
  useRestyleStore.setState({ versions: [version('a', 2), version('b', 0)], selectedVersionId: 'a' })
  restyle().deleteVersion('a')
  assert.equal(restyle().selectedVersionId, 'b')
  assert.equal(mode().renderSlot, 0)
})
