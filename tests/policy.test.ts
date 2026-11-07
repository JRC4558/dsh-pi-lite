import { describe, expect, it } from 'vitest'
import { checkQuota, isAllowed, repeatKey } from '../src/policy.js'

describe('pi-lite policy', () => {
  it('checks the allow-list', () => {
    expect(isAllowed('read', ['read', 'bash'])).toBe(true)
    expect(isAllowed('web_search', ['read', 'bash'])).toBe(false)
  })

  it('builds a stable repeat key', () => {
    expect(repeatKey('bash', { command: 'ls' })).toBe(repeatKey('bash', { command: 'ls' }))
    expect(repeatKey('bash', { command: 'ls' })).not.toBe(repeatKey('bash', { command: 'pwd' }))
    expect(repeatKey('x', 1n)).toBe('x:<unserializable>')
  })

  it('meters a per-session quota', () => {
    expect(checkQuota(0, 5).allowed).toBe(true)
    expect(checkQuota(4, 5).allowed).toBe(true)
    expect(checkQuota(5, 5).allowed).toBe(false)
  })
})
