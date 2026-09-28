# Walrus Memory feedback draft

## Friction point

The durable write path is asynchronous, but the UI-facing distinction between `accepted`, `uploaded`, `done`, and immediately recallable is easy to misunderstand. Even after a job reaches a terminal success state, retrieval may briefly lag. A chatbot demo therefore needs custom polling, a pending state, and defensive re-query logic to avoid claiming that a memory is available too early.

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
