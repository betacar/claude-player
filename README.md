# claude-player

Elevator music for Claude Code. Plays a random lounge-jazz track in the background while Claude is thinking, rotates tracks if work runs long, stops the moment Claude finishes, and never repeats the same track back-to-back.

```
[Opus 4.7] 📁 claude-player │ ♪ Bossa Nova Background Music Version 60s
```

## Install

### As a Claude Code plugin (recommended)

In Claude Code:

```
/plugin marketplace add <git-url-of-this-repo>
/plugin install claude-player@claude-player
```

Restart Claude Code. From your next prompt, music starts one second after you hit enter and stops when Claude finishes responding.

### As a local plugin (for development or one-machine use)

```
git clone <git-url-of-this-repo>
claude --plugin-dir ./claude-player
```

## Usage

Music plays automatically while Claude is working. Control it with the bundled slash command:

```
/claude-player:music start         # enable the hook
/claude-player:music stop          # disable the hook (and silence)
/claude-player:music skip          # jump to the next random track
/claude-player:music now           # what's playing right now
/claude-player:music history       # last 10 tracks played
/claude-player:music status        # full state dump
/claude-player:music toggle        # flip enabled ↔ disabled
```

The disabled state persists across sessions until you `start` again.

## Optional: now-playing in the status line

Plugin `settings.json` can't configure Claude Code's main status line (the format only supports `agent` and `subagentStatusLine`), so this is a one-time manual step. Add the following block to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash \"$HOME/.claude/plugins/cache/claude-player/claude-player/bin/elevator-music-statusline\"",
    "refreshInterval": 1
  }
}
```

After restarting Claude Code, the status bar will show the prettified current track with a rotating music glyph (🎵 ♫ ♬ ♪), `🎼 cueing up…` during the 1-second pre-roll, or `🔇 elevator-music off` while disabled (toggle via `/claude-player:music stop`).

## Configuration

| Env var                      | Default                    | Effect                                          |
| :--------------------------- | :------------------------- | :---------------------------------------------- |
| `ELEVATOR_MUSIC_TRACKS_DIR`  | `<plugin-root>/tracks`     | Directory scanned for audio files               |
| `ELEVATOR_MUSIC_STATE_DIR`   | `~/.claude/elevator-music` | Where PID files, history, and the disabled flag live |
| `ELEVATOR_MUSIC_START_DELAY` | `1.0`                      | Seconds to wait before starting the first track |

To swap in your own music, drop `.mp3`/`.wav`/`.m4a`/`.flac`/`.ogg` files into any directory and point `ELEVATOR_MUSIC_TRACKS_DIR` at it.

## Requirements

- **macOS** — uses the built-in `afplay`. No setup needed.
- **Linux** — needs one of `mpg123`, `ffplay`, `mpv`, or `paplay` on `PATH`.
- **Windows** — needs `ffplay`, `mpg123`, or `mpv` on `PATH` (a PowerShell + MediaPlayer fallback exists but is single-shot, not looped).

`python3` (or `jq`) is recommended for the hook to parse Claude Code's JSON payloads; both are present by default on macOS.

## How it works

Three Claude Code hooks drive the behavior:

- **`UserPromptSubmit`** spawns a detached background bash loop. It sleeps a cancellable second, then picks a random track that isn't the last one played and launches the OS-native audio player. When the player exits (track ends), the loop picks another one.
- **`Stop`** and **`SubagentStop`** send `SIGTERM` to the loop. A trap inside the loop kills the active player child instantly. If `Stop` fires inside the 1-second pre-roll, no audio is ever produced — fast Claude responses stay silent.

State lives in `~/.claude/elevator-music/`: a PID file for the loop, a separate child-PID file for the active player (this is what the statusline checks), the last-played track filename, a timestamped `history.log`, and a `disabled` flag.

## Track credits

The bundled tracks are royalty-free lounge-jazz and bossa-nova clips downloaded from [Pixabay](https://pixabay.com/music/search/elevator%20music/). Replace them with your own via `ELEVATOR_MUSIC_TRACKS_DIR` if you prefer different mood music.

## License

MIT — see [`LICENSE`](LICENSE).
