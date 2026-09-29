# Walrus Memory feedback draft

## Published GitHub ticket

- [MystenLabs/MemWal #1053 — Add progress callbacks to waitForRememberJob for UI status](https://github.com/MystenLabs/MemWal/issues/1053)

## Friction point

The durable write path is asynchronous, but the UI-facing distinction between `accepted`, `uploaded`, `done`, and immediately recallable is easy to misunderstand. Even after a job reaches a terminal success state, retrieval may briefly lag. A chatbot demo therefore needs custom polling, a pending state, and defensive re-query logic to avoid claiming that a memory is available too early.

This occurred during real-user testing: the managed relayer remained reachable but returned `write_ready: false`, while accepted jobs stayed `running`. The original UI incorrectly labelled those jobs `SAVED`. The tester's screenshot and successful retest are preserved in [the real-user test report](REAL_USER_TEST_REPORT.md).

Reproduction environment:

- Cloudflare Workers with `nodejs_compat`
- TypeScript
- `@mysten-incubation/memwal` 0.1.8
- managed Mainnet relayer
- Qwen3 on Workers AI

## Improvement idea

Add a first-class `rememberUntilRecallable()` helper or an optional `consistency: "read-after-write"` mode. The method should resolve only when the newly written blob is visible to a matching recall query, return timing metadata for accepted/uploaded/indexed/recallable stages, and expose a stable status type suitable for user interfaces.

## Positive feedback

The official `MemWalMock` is unusually valuable. It makes deterministic local testing possible without credentials, gas, network access, or accidental Mainnet writes, while preserving the same core method names used in production.

## Action taken in the project

Walrus Promise now labels accepted jobs `PENDING`, waits up to 90 seconds, reports prolonged jobs as `STILL PROCESSING`, reads the relayer's write-readiness signal, and displays `SAVED` only after receiving a blob ID. A transient AI call is retried once, and a memory write failure no longer suppresses an otherwise valid coach response.
