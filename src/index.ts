/**
 * dsh-pi-lite — minimal Pi-like guardrails for DeepSeek Harness.
 *
 * This plugin only enforces policy; the preset composes the standard DSH tools
 * (read, write, edit, bash, skill, read_image, web_search, web_fetch). It adds
 * no modern CLI wrappers, no LSP, no containers, no home-manager assumptions,
 * and no mandatory shell rules. It never changes the model's reasoning budget.
 */
import z from 'schemastery'

/** Runtime configuration for the mode. */
export interface Config {
  /** Tools the model may call. Everything else is denied. */
  allow: string[]
  /** Tool calls allowed in one turn before the watchdog cancels it. */
  maxToolCallsPerTurn: number
  /** Identical calls (same name and arguments) allowed before cancelling. */
  repeatLimit: number
  /** Wall-clock budget for one turn in milliseconds. */
  taskTimeoutMs: number
  /** Wall-clock budget for the whole session in milliseconds. */
  sessionTimeoutMs: number
  /** Input + output tokens allowed for the whole session. */
  maxSessionTokens: number
  /** Free `web_search` calls per session. */
  searchLimit: number
  /** Free `read_image` calls per session. */
  imageLimit: number
  /** What to do when a watchdog trips. */
  watchdog: 'cancel-turn' | 'off'
}

/** Configuration schema consumed by the Cordis loader. */
export const Config: z<Config> = z.object({
  allow: z
    .array(z.string())
    .default(['read', 'write', 'edit', 'bash', 'skill', 'read_image', 'web_search', 'web_fetch']),
  maxToolCallsPerTurn: z.number().default(40),
  repeatLimit: z.number().default(3),
  taskTimeoutMs: z.number().default(1_800_000),
  sessionTimeoutMs: z.number().default(14_400_000),
  maxSessionTokens: z.number().default(2_000_000),
  searchLimit: z.number().default(5),
  imageLimit: z.number().default(10),
  watchdog: z.union([z.const('cancel-turn'), z.const('off')]).default('cancel-turn'),
})

interface AgentLike {
  readonly id: string
  cancel(reason: { kind: 'hook'; reason: string }): void
}

interface TurnState {
  timer?: NodeJS.Timeout
  calls: number
  repeats: Map<string, number>
  tripped: boolean
}

interface SessionState {
  timer?: NodeJS.Timeout
  tokens: number
  searches: number
  images: number
}

/** Event names and payloads are typed by DSH at runtime; this plugin keeps a
 * narrow structural view so it stays installable without the full SDK types. */
interface PluginContext {
  on(event: 'agent/created', listener: (payload: { agent: AgentLike }) => void): void
  on(event: 'agent/disposed', listener: (payload: { agent: AgentLike }) => void): void
  on(event: 'session/event', listener: (session: { id: string }, event: SessionEvent) => void): void
  on(
    event: 'tools/pre-execute',
    listener: (exec: ToolExecution, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision>,
  ): void
}

interface SessionEvent {
  readonly type: string
  readonly data?: {
    readonly turn?: number
    readonly usage?: { readonly inputTokens?: number; readonly outputTokens?: number }
  }
}

interface ToolExecution {
  readonly name: string
  readonly arguments: unknown
  readonly agent?: AgentLike
}

type PreToolDecision = { kind: 'allow' } | { kind: 'deny'; reason: string }

import { checkQuota, isAllowed, repeatKey } from './policy.js'

const TOOL_METER: Record<string, 'search' | 'image'> = {
  web_search: 'search',
  read_image: 'image',
}

/** Plugin name. */
export const name = 'pi-lite'

/** Install the policy hooks. */
export function apply(ctx: PluginContext, config: Config): void {
  const agents = new Map<string, AgentLike>()
  const sessions = new Map<string, SessionState>()
  const turns = new Map<string, TurnState>()

  const stateOf = (id: string): SessionState => {
    let state = sessions.get(id)
    if (state === undefined) {
      state = { tokens: 0, searches: 0, images: 0 }
      sessions.set(id, state)
    }
    return state
  }

  const turnOf = (id: string): TurnState => {
    let state = turns.get(id)
    if (state === undefined) {
      state = { calls: 0, repeats: new Map(), tripped: false }
      turns.set(id, state)
    }
    return state
  }

  const cancel = (agent: AgentLike | undefined, reason: string): void => {
    if (config.watchdog === 'off' || agent === undefined) return
    try {
      agent.cancel({ kind: 'hook', reason })
    } catch {
      // A disposed agent must not fail the hook.
    }
  }

  ctx.on('agent/created', ({ agent }) => {
    agents.set(agent.id, agent)
    const state = stateOf(agent.id)
    if (config.sessionTimeoutMs > 0) {
      state.timer = setTimeout(() => {
        cancel(agents.get(agent.id), `pi-lite: session timeout after ${config.sessionTimeoutMs}ms`)
      }, config.sessionTimeoutMs)
      state.timer.unref()
    }
  })

  ctx.on('agent/disposed', ({ agent }) => {
    const state = sessions.get(agent.id)
    if (state?.timer !== undefined) clearTimeout(state.timer)
    const turn = turns.get(agent.id)
    if (turn?.timer !== undefined) clearTimeout(turn.timer)
    sessions.delete(agent.id)
    turns.delete(agent.id)
    agents.delete(agent.id)
  })

  ctx.on('session/event', (session, event) => {
    if (event.type === 'turn/start') {
      const state = turnOf(session.id)
      if (state.timer !== undefined) clearTimeout(state.timer)
      state.calls = 0
      state.repeats.clear()
      state.tripped = false
      if (config.taskTimeoutMs > 0) {
        state.timer = setTimeout(() => {
          cancel(agents.get(session.id), `pi-lite: turn timeout after ${config.taskTimeoutMs}ms`)
        }, config.taskTimeoutMs)
        state.timer.unref()
      }
    } else if (event.type === 'turn/end') {
      const state = turns.get(session.id)
      if (state?.timer !== undefined) clearTimeout(state.timer)
    } else if (event.type === 'assistant/message') {
      const usage = event.data?.usage
      if (usage === undefined) return
      const sessionState = stateOf(session.id)
      sessionState.tokens += (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
      if (config.maxSessionTokens > 0 && sessionState.tokens > config.maxSessionTokens) {
        cancel(agents.get(session.id), `pi-lite: session token budget of ${config.maxSessionTokens} exceeded`)
      }
    }
  })

  ctx.on('tools/pre-execute', async (exec, next) => {
    if (!isAllowed(exec.name, config.allow)) {
      return { kind: 'deny', reason: `pi-lite: tool "${exec.name}" is not in the allow-list` }
    }

    const sessionState = stateOf(exec.agent?.id ?? 'anonymous')
    const meter = TOOL_METER[exec.name]
    if (meter === 'search' && !checkQuota(sessionState.searches, config.searchLimit).allowed) {
      return { kind: 'deny', reason: `pi-lite: web_search budget of ${config.searchLimit} per session is exhausted` }
    }
    if (meter === 'image' && !checkQuota(sessionState.images, config.imageLimit).allowed) {
      return { kind: 'deny', reason: `pi-lite: read_image budget of ${config.imageLimit} per session is exhausted` }
    }

    const turn = turnOf(exec.agent?.id ?? 'anonymous')
    turn.calls += 1
    if (config.maxToolCallsPerTurn > 0 && turn.calls > config.maxToolCallsPerTurn) {
      if (!turn.tripped) {
        turn.tripped = true
        cancel(exec.agent, `pi-lite: turn used its ${config.maxToolCallsPerTurn}-call tool budget`)
      }
      return { kind: 'deny', reason: `pi-lite: turn tool budget of ${config.maxToolCallsPerTurn} exhausted` }
    }

    const key = repeatKey(exec.name, exec.arguments)
    const repeats = (turn.repeats.get(key) ?? 0) + 1
    turn.repeats.set(key, repeats)
    if (config.repeatLimit > 0 && repeats > config.repeatLimit) {
      if (!turn.tripped) {
        turn.tripped = true
        cancel(exec.agent, `pi-lite: tool "${exec.name}" repeated ${repeats} times with identical arguments`)
      }
      return { kind: 'deny', reason: `pi-lite: "${exec.name}" repeated ${repeats} times without progress` }
    }

    if (meter === 'search') sessionState.searches += 1
    if (meter === 'image') sessionState.images += 1
    return next()
  })
}
