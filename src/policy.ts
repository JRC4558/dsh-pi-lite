/** Pure policy helpers kept free of harness types so they are unit-testable. */

/** Whether a tool name is in the configured allow-list. */
export function isAllowed(name: string, allow: readonly string[]): boolean {
  return allow.includes(name)
}

/** Stable key for repeated-call detection; arguments are JSON when possible. */
export function repeatKey(name: string, args: unknown): string {
  try {
    return `${name}:${JSON.stringify(args)}`
  } catch {
    return `${name}:<unserializable>`
  }
}

/** Quota result for one metered family. */
export interface QuotaVerdict {
  readonly allowed: boolean
  readonly used: number
  readonly limit: number
}

/** Whether one more call fits under a per-session quota. */
export function checkQuota(used: number, limit: number): QuotaVerdict {
  return { allowed: used < limit, used, limit }
}
