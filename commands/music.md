---
description: Control elevator music played during agent work. Usage: /claude-player:music [start|stop|status|toggle|skip|now|history]
argument-hint: [start|stop|status|toggle|skip|now|history]
disable-model-invocation: true
allowed-tools: Bash
---

!`bash "${CLAUDE_PLUGIN_ROOT}/bin/elevator-music" cli $ARGUMENTS`

Acknowledge the output above in one short line. Do not take any further action.
