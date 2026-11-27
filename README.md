# claude-player

Elevator music for Claude Code. A Claude Code mod (plugin name `elevator-music`) plays a random lounge-jazz track while Claude works, rotates tracks if the work runs long, stops when Claude finishes, and never repeats the same track back-to-back.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install elevator-music --marketplace betacar/claude-player
```

Answer `y` to add the marketplace, then pick a scope. From the CLI: `claude plugin install elevator-music --marketplace betacar/claude-player`.

For development, run it from a clone:

```
git clone git@github.com:betacar/claude-player.git
claude --plugin-dir ./claude-player
```

> The plugin is named `elevator-music`, not `claude-player`: Claude Code reserves plugin names that start with `claude-`.

## Usage

Music starts one second after a turn starts and stops when the main turn completes. Fast turns stay silent. Subagents finishing do not stop the music.

```
/music on       # enable (persists across sessions)
/music off      # disable and silence
/music toggle   # flip enabled / disabled
/music skip     # jump to the next random track
/music now      # what is playing right now
/music status   # enabled state, player style, current track
```

`/music` runs at once, even while Claude is working.

## Player style: `player` option

| Value             | What you see                                                                                        |
| :---------------- | :-------------------------------------------------------------------------------------------------- |
| `smol` (default)  | `♪ <track name>` in the status line under the prompt while a track plays.                           |
| `chonky`          | A band above the prompt: `♪ <track name>`, a Play/Pause button and a Next button.                   |

In `chonky`, Pause stops the track and keeps the player silent, also for later turns, until you press Play. Play starts a new track (there is no seek, so a track never resumes where it stopped). Play while idle starts music, which stops at the end of the next turn.

Set the option in `/config` (the `elevator-music` player row), or in `settings.json`:

```json
{
  "pluginConfigs": {
    "elevator-music": { "options": { "player": "chonky" } }
  }
}
```

## Requirements and limits

- **macOS only.** Playback uses Claude Code's built-in `$.audio.play`, which plays through `afplay` on macOS. On Linux and Windows it plays nothing. The old shell version supported `mpg123`, `ffplay`, `mpv`, `paplay` and PowerShell; this mod does not.
- **Dropped from the shell version:**
  - `/music history` and the history log.
  - The env vars `ELEVATOR_MUSIC_TRACKS_DIR`, `ELEVATOR_MUSIC_STATE_DIR` and `ELEVATOR_MUSIC_START_DELAY`. Tracks come from the plugin's `tracks/` folder. The delay is fixed at one second.
  - The status line script. The `player` option replaces it.

To use your own music, put `.mp3`/`.wav`/`.m4a`/`.flac`/`.ogg` files in `tracks/` of your clone and run it with `--plugin-dir`.

## How it works

`hooks/register.tsx` is the mod's hooks module:

- `turn.start` (main loop only) arms a one-second timer. When it fires, a loop plays one track at a time and picks a random track that is not the last one played.
- `turn.complete` (main loop only) cancels the timer or aborts the current track. If it fires inside the first second, no audio plays.
- `command.run` serves `/music`. The enabled flag lives in the plugin's store, so it survives sessions.

## Track credits

The bundled tracks are royalty-free lounge-jazz and bossa-nova clips from [Pixabay](https://pixabay.com/music/search/elevator%20music/).

## License

MIT — see [`LICENSE`](LICENSE).
