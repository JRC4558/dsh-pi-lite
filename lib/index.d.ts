/**
 * dsh-pi-lite — minimal Pi-like guardrails for DeepSeek Harness.
 *
 * This plugin only enforces policy; the preset composes the standard DSH tools
 * (read, write, edit, bash, skill, read_image, web_search, web_fetch). It adds
 * no modern CLI wrappers, no LSP, no containers, no home-manager assumptions,
 * and no mandatory shell rules. It never changes the model's reasoning budget.
 */
import z from 'schemastery';
/** Runtime configuration for the mode. */
export interface Config {
    /** Tools the model may call. Everything else is denied. */
    allow: string[];
    /** Tool calls allowed in one turn before the watchdog cancels it. */
    maxToolCallsPerTurn: number;
    /** Identical calls (same name and arguments) allowed before cancelling. */
    repeatLimit: number;
    /** Wall-clock budget for one turn in milliseconds. */
    taskTimeoutMs: number;
    /** Wall-clock budget for the whole session in milliseconds. */
    sessionTimeoutMs: number;
    /** Input + output tokens allowed for the whole session. */
    maxSessionTokens: number;
    /** Free `web_search` calls per session. */
    searchLimit: number;
    /** Free `read_image` calls per session. */
    imageLimit: number;
    /** What to do when a watchdog trips. */
    watchdog: 'cancel-turn' | 'off';
}
/** Configuration schema consumed by the Cordis loader. */
export declare const Config: z<Config>;
interface AgentLike {
    readonly id: string;
    cancel(reason: {
        kind: 'hook';
        reason: string;
    }): void;
}
/** Event names and payloads are typed by DSH at runtime; this plugin keeps a
 * narrow structural view so it stays installable without the full SDK types. */
interface PluginContext {
    on(event: 'agent/created', listener: (payload: {
        agent: AgentLike;
    }) => void): void;
    on(event: 'agent/disposed', listener: (payload: {
        agent: AgentLike;
    }) => void): void;
    on(event: 'session/event', listener: (session: {
        id: string;
    }, event: SessionEvent) => void): void;
    on(event: 'tools/pre-execute', listener: (exec: ToolExecution, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision>): void;
}
interface SessionEvent {
    readonly type: string;
    readonly data?: {
        readonly turn?: number;
        readonly usage?: {
            readonly inputTokens?: number;
            readonly outputTokens?: number;
        };
    };
}
interface ToolExecution {
    readonly name: string;
    readonly arguments: unknown;
    readonly agent?: AgentLike;
}
type PreToolDecision = {
    kind: 'allow';
} | {
    kind: 'deny';
    reason: string;
};
/** Plugin name. */
export declare const name = "pi-lite";
/** Install the policy hooks. */
export declare function apply(ctx: PluginContext, config: Config): void;
export {};
