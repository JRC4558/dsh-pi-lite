/** Pure policy helpers kept free of harness types so they are unit-testable. */
/** Whether a tool name is in the configured allow-list. */
export declare function isAllowed(name: string, allow: readonly string[]): boolean;
/** Stable key for repeated-call detection; arguments are JSON when possible. */
export declare function repeatKey(name: string, args: unknown): string;
/** Quota result for one metered family. */
export interface QuotaVerdict {
    readonly allowed: boolean;
    readonly used: number;
    readonly limit: number;
}
/** Whether one more call fits under a per-session quota. */
export declare function checkQuota(used: number, limit: number): QuotaVerdict;
