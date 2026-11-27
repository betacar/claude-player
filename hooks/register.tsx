import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

const track = atom({ plugin: 'elevator-music', key: 'track' } as const, null)
const isPaused = atom({ plugin: 'elevator-music', key: 'isPaused' } as const, false)

const START_DELAY_MS = 1000
const AUDIO = /\.(mp3|wav|m4a|flac|ogg)$/i
const USAGE = 'usage: /music [on|off|toggle|skip|now|status]'

// "uploader-some-elevator-music-title-123456.mp3" -> "Some Title"
export function prettyName(file: string): string {
  let n = file.replace(/\.[^.]+$/, '').replace(/-\d{4,}$/, '')
  if (n.includes('-')) n = n.slice(n.indexOf('-') + 1)
  return n
    .replace(/-?elevator-music-?/g, '')
    .replace(/[-_\s]+/g, ' ')
    .trim()
    .replace(/\S+/g, w => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
}

// Controllers are not drawing state, so they live here; a hot reload drops them.
let delay: Timer | undefined
let run: AbortController | undefined
let clip: AbortController | undefined
let last: string | undefined
let isChonky = false

async function isOff($: EngineInterface) {
  return (await $.store.get('disabled')) === true
}

async function loop($: EngineInterface, signal: AbortSignal) {
  try {
    const files = (await $.fs.list(`${$.plugin.root}/tracks`))
      .filter(f => f.kind === 'file' && AUDIO.test(f.name))
      .map(f => f.name)
    while (!signal.aborted && files.length > 0) {
      const pool = files.length > 1 ? files.filter(f => f !== last) : files
      const file = pool[Math.floor(Math.random() * pool.length)]!
      last = file
      const ctl = (clip = new AbortController())
      await update($, track, () => file)
      if (!isChonky) $.ui.status(`♪ ${prettyName(file)}`)
      const startedAt = await $.clock.now()
      await $.audio.play({ asset: `tracks/${file}` }, { signal: ctl.signal })
      // ponytail: off macOS play() resolves at once having played nothing;
      // a clip that "ends" in under a second without a skip stops the loop.
      if (!ctl.signal.aborted && (await $.clock.now()) - startedAt < 1000) break
    }
  } finally {
    // A newer loop owns the track and status now; leave them alone.
    if (run && run.signal !== signal) return
    run = clip = undefined
    if (!(await read($, isPaused))) await update($, track, () => null)
    $.ui.status(undefined)
  }
}

function start($: EngineInterface, ms = START_DELAY_MS) {
  if (run) return
  const ctl = new AbortController()
  run = ctl
  // A timer, not a sleep in the hook: the music outlives the hook's dispatch.
  delay = $.clock.after(ms, () => void loop($, ctl.signal).catch(() => {}))
}

function stop() {
  delay?.cancel()
  run?.abort()
  clip?.abort()
  delay = run = clip = undefined
}

// Pause has no seek: it stops the clip, and play starts a fresh track.
async function pause($: EngineInterface) {
  await update($, isPaused, () => true)
  stop()
}

async function play($: EngineInterface) {
  await update($, isPaused, () => false)
  start($, 0)
}

export const register: Register = (on, options) => {
  isChonky = options.player === 'chonky'

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'music',
      description: 'Control the elevator music',
      argumentHint: '[on|off|toggle|skip|now|status]',
      immediate: true,
    })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && !(await isOff($)) && (!isChonky || !(await read($, isPaused)))) start($)
    return next(e)
  })

  // Main loop only: a subagent finishing must not stop the music.
  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) stop()
    return next(e)
  })

  on('command.run', { command: 'music' }, async ($, e) => {
    const action = e.args.trim() || 'status'
    const off = await isOff($)
    const file = run ? await read($, track) : null
    switch (action) {
      case 'on':
      case 'off':
      case 'toggle': {
        const disable = action === 'toggle' ? !off : action === 'off'
        await $.store.set('disabled', disable)
        if (disable) {
          await update($, isPaused, () => false)
          stop()
          await update($, track, () => null)
        }
        return { text: `elevator-music ${disable ? 'disabled' : 'enabled'}.` }
      }
      case 'skip':
        if (!clip) return { text: 'Nothing playing to skip.' }
        clip.abort()
        return { text: 'Skipped. Next track loading.' }
      case 'now':
        return { text: file ? `♪ ${prettyName(file)} (${file})` : '(silent)' }
      case 'status':
        return {
          text: [
            `elevator-music: ${off ? 'disabled' : 'enabled'}`,
            `player:        ${options.player}`,
            `now playing:   ${file ? prettyName(file) : '(silent)'}`,
          ].join('\n'),
        }
      default:
        return { text: USAGE }
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const file = await read($, track)
    const paused = await read($, isPaused)
    if (!isChonky || e.props.hasSurvey || (file === null && !paused)) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor={paused}>♪ {file === null ? 'Paused' : prettyName(file)} </Text>
        <Button
          key="toggle"
          label={paused ? 'Play' : 'Pause'}
          onPress={async () => ((await read($, isPaused)) ? play($) : pause($))}
        />
        <Button key="next" label="Next" onPress={() => (run ? clip?.abort() : play($))} />
      </Box>
    )
  })
}
