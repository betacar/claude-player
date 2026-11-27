import { expect, test } from 'claude-code/testing'

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
