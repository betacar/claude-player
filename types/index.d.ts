export type Track = string | null

declare module 'claude-code' {
  interface PluginState {
    'elevator-music': {
      /** The track file playing now, or kept while paused; null when silent. */
      track: Track
      isPaused: boolean
    }
  }
}
