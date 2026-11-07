import { describe, expect, it, vi } from 'vitest'
import { apply, type Config } from '../src/index.js'

type Listener = (first: unknown, second: unknown) => unknown

function install(config: Config) {
  const listeners = new Map<string, Listener>()
  const ctx = {
    on(event: string, listener: Listener) {
      listeners.set(event, listener)
    },
  }
  apply(ctx as never, config)
  const agent = { id: 'session-1', cancel: vi.fn() }
  const pre = async (name: string, args: unknown = {}) => {
    const listener = listeners.get('tools/pre-execute') as (
      exec: { name: string; arguments: unknown; agent: unknown },
      next: () => Promise<{ kind: 'allow' }>,
    ) => Promise<{ kind: string; reason?: string }>
    return await listener({ name, arguments: args, agent }, async () => ({ kind: 'allow' }))
  }
  const turn = (type: string) => {
    const listener = listeners.get('session/event') as (session: unknown, event: unknown) => void
    listener({ id: 'session-1' }, { type })
  }
  return { pre, turn, agent }
}

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    allow: ['read', 'write', 'web_search', 'read_image'],
    maxToolCallsPerTurn: 100,
    repeatLimit: 3,
    taskTimeoutMs: 0,
    sessionTimeoutMs: 0,
    maxSessionTokens: 0,
    searchLimit: 5,
    imageLimit: 10,
    watchdog: 'cancel-turn',
    ...overrides,
  }
}

describe('pi-lite plugin', () => {
  it('denies a tool outside the allow-list', async () => {
    const { pre } = install(baseConfig())
    expect((await pre('bash')).kind).toBe('deny')
  })

  it('cancels the turn after the tool-call budget', async () => {
    const { pre, turn, agent } = install(baseConfig({ maxToolCallsPerTurn: 2 }))
    turn('turn/start')
    expect((await pre('read')).kind).toBe('allow')
    expect((await pre('read')).kind).toBe('allow')
    expect((await pre('read')).kind).toBe('deny')
    expect(agent.cancel).toHaveBeenCalledTimes(1)
  })

  it('stops identical repeated calls', async () => {
    const { pre, turn, agent } = install(baseConfig({ repeatLimit: 2 }))
    turn('turn/start')
    expect((await pre('read', { path: 'a' })).kind).toBe('allow')
    expect((await pre('read', { path: 'a' })).kind).toBe('allow')
    expect((await pre('read', { path: 'a' })).kind).toBe('deny')
    expect(agent.cancel).toHaveBeenCalledTimes(1)
  })

  it('meters web_search and read_image per session', async () => {
    const { pre, turn } = install(baseConfig({ searchLimit: 2, imageLimit: 1 }))
    turn('turn/start')
    expect((await pre('web_search', { query: 'a' })).kind).toBe('allow')
    expect((await pre('web_search', { query: 'b' })).kind).toBe('allow')
    expect((await pre('web_search', { query: 'c' })).kind).toBe('deny')
    expect((await pre('read_image', { path: 'a.png' })).kind).toBe('allow')
    expect((await pre('read_image', { path: 'b.png' })).kind).toBe('deny')
  })
})
