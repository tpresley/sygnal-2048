import { it, expect, afterEach, vi } from 'vitest'
import { renderComponent } from 'sygnal'
import App from './app.jsx'

let t
afterEach(() => {
  t?.dispose()
  vi.restoreAllMocks()
})

// with Math.random() pinned to 0, new tiles always land in the first open slot with a value of 2
const pinRandom = () => vi.spyOn(Math, 'random').mockReturnValue(0)

it('starts a game with two tiles', async () => {
  pinRandom()
  t = renderComponent(App, { strict: true })
  const state = await t.waitForState(s => s.tiles.length === 2 && !s.locked)
  expect(state.score).toBe(0)
  expect(t.queryAll('.tile')).toHaveLength(2)
  t.expectNoDiagnostics()
})

it('merges tiles on an arrow key, scores, and adds a new tile', async () => {
  pinRandom()
  t = renderComponent(App, { strict: true })
  await t.waitForState(s => s.tiles.length === 2)

  // the two starting tiles (both 2s) sit side by side in the top row
  t.simulateEvent('document', 'keydown', { key: 'ArrowLeft' })
  await t.next(s => s.score === 4 && s.locked)

  // a new tile is added, and the merged-away tile removes itself after its transition
  const state = await t.next(s => !s.locked && s.tiles.length === 2 && !s.tiles.some(tile => tile.deleted))
  expect(state.max).toBe(4)
  expect(t.queryAll('.tile')).toHaveLength(2)
  t.expectNoDiagnostics()
})

it('restarts the game from the Start Over button', async () => {
  pinRandom()
  t = renderComponent(App, { strict: true })
  await t.waitForState(s => s.tiles.length === 2)
  t.simulateEvent('document', 'keydown', { key: 'ArrowLeft' })
  await t.next(s => s.score === 4)

  t.simulateEvent('.restart', 'click')
  const state = await t.next(s => s.score === 0 && s.tiles.length === 2 && !s.locked)
  expect(state.max).toBe(2)
  t.expectNoDiagnostics()
})
