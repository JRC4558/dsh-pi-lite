/** Pure policy helpers kept free of harness types so they are unit-testable. */
/** Whether a tool name is in the configured allow-list. */
export function isAllowed(name, allow) {
    return allow.includes(name);
}
/** Stable key for repeated-call detection; arguments are JSON when possible. */
export function repeatKey(name, args) {
    try {
        return `${name}:${JSON.stringify(args)}`;
    }
    catch {
        return `${name}:<unserializable>`;
    }
}
/** Whether one more call fits under a per-session quota. */
export function checkQuota(used, limit) {
    return { allowed: used < limit, used, limit };
}
