import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { prettyName } from './register'

const FILE = 'music_for_video-elevator-music-bossa-nova-background-music-version-60s-10900.mp3'

const BAND = {
  plugin: 'elevator-music',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: true,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('pretty names', () => {
  expect(prettyName(FILE)).toBe('Bossa Nova Background Music Version 60s')
  expect(prettyName('lesiakower-waiting-room-122773.mp3')).toBe('Waiting Room')
  expect(prettyName('abydos_music-great-latin-elevator-music-176570.mp3')).toBe('Great Latin')
})

test('the chonky band shows the track with play/pause and next', { options: { player: 'chonky' } }, async ($, on) => {
  on('state.get', (_, e, next) =>
    e.key === 'track' ? { value: { value: FILE, version: 1 } } : next(e),
  )

  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ type: 'Text', text: /♪/ }))?.text).toBe(
    '♪ Bossa Nova Background Music Version 60s ',
  )
  expect(await ui.find({ key: 'toggle' })).toBeDefined()
  expect(await ui.find({ key: 'next' })).toBeDefined()
  await ui.unmount()
})

const TRACKS = ['a-one-1111.mp3', 'b-two-2222.mp3']
const MAIN_START = { text: 'hi', turnId: 't1' }
const DONE = { answer: '', durationMs: 0, isAborted: false, reason: 'answer', turnId: 't1' } as const

// The engine beneath the mod: two tracks, and a clip that plays until stopped
// (or, given clipMs, until it ends on the mocked clock). stopLagMs makes a
// stopped clip settle late, as an engine slow to tear down audio would.
function world(on: On, { clipMs, stopLagMs }: { clipMs?: number; stopLagMs?: number } = {}) {
  const clock = mock.clock(on)
  mock.store(on)
  const played: string[] = []
  const signals: AbortSignal[] = []
  on('fs.list', () => ({ value: TRACKS.map(name => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })) }))
  on('ui.status', () => ({ value: undefined }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('audio.play', async (_, e, next) => {
    played.push('asset' in e.clip ? String(e.clip.asset) : '')
    signals.push(next.signal)
    await new Promise<void>(done => {
      next.signal.addEventListener('abort', () =>
        stopLagMs === undefined ? done() : void clock.sleep(stopLagMs).then(done),
      )
      if (clipMs !== undefined) void clock.sleep(clipMs).then(done)
    })
    return { value: undefined }
  })
  return { clock, played, signals }
}

test('a subagent finishing does not stop the music', async ($, on) => {
  const { clock, played, signals } = world(on)

  await $.turn.start(MAIN_START)
  await clock.advance(1001)
  expect(played).toHaveLength(1)

  await $.turn.complete({ ...DONE, agentId: 'a1' })
  await clock.settle()
  expect(signals[0]!.aborted).toBe(false)

  await $.turn.complete(DONE)
  await clock.settle()
  expect(signals[0]!.aborted).toBe(true)
})

test('a subagent starting does not start the music', async ($, on) => {
  const { clock, played } = world(on)

  await $.turn.start({ ...MAIN_START, agentId: 'a1' })
  await clock.advance(1001)
  expect(played).toHaveLength(0)
})

test('a second turn start does not start a second loop', async ($, on) => {
  const { clock, played } = world(on)

  await $.turn.start(MAIN_START)
  await clock.advance(1001)
  await $.turn.start({ ...MAIN_START, turnId: 't2' })
  await clock.advance(1001)
  expect(played).toHaveLength(1)

  await $.turn.complete(DONE)
  await clock.settle()
})

test('a fast turn stays silent', async ($, on) => {
  const { clock, played } = world(on)

  await $.turn.start(MAIN_START)
  await clock.advance(500)
  await $.turn.complete(DONE)
  await clock.advance(2000)
  expect(played).toHaveLength(0)
})

test('pause then play keeps the band', { options: { player: 'chonky' } }, async ($, on) => {
  // The old clip settles 50 ms after Pause, so the old loop's finally runs
  // after Play has started the new loop.
  const { clock, played } = world(on, { stopLagMs: 50 })

  await $.turn.start(MAIN_START)
  await clock.advance(1001)
  expect(played).toHaveLength(1)

  const ui = await $.ui.mount(BAND)
  await ui.press({ key: 'toggle' }) // Pause
  await ui.press({ key: 'toggle' }) // Play
  await clock.advance(100)
  expect(played).toHaveLength(2)

  expect((await ui.find({ type: 'Text', text: /♪/ }))?.text).toMatch(/^♪ (One|Two) $/)
  await ui.unmount()

  // A fresh drawing reads the track state anew: null would hide the band.
  const again = await $.ui.mount(BAND)
  expect((await again.find({ type: 'Text', text: /♪/ }))?.text).toMatch(/^♪ (One|Two) $/)
  await again.unmount()
  await $.turn.complete(DONE)
  await clock.settle()
})

test('no track plays twice in a row', async ($, on) => {
  const { clock, played } = world(on, { clipMs: 2000 })

  await $.turn.start(MAIN_START)
  await clock.advance(1001)
  // 12 clips: a picker without the no-repeat filter passes by luck at (1/2)^11.
  for (let i = 0; i < 11; i++) await clock.advance(2000)
  expect(played.length).toBeGreaterThanOrEqual(12)
  for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1])

  await $.turn.complete(DONE)
  await clock.settle()
})
