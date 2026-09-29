# Walrus Promise 🦭

<img src="public/walrus-promise-logo.png" alt="Walrus Promise logo" width="140" />

> **Accountability that survives the session.**

[**Launch the live app →**](https://walrus-promise.walrus-promise-lab.workers.dev)

[**Watch the 36-second demo →**](https://youtu.be/Wyqzu01JC2c)

[**Read the technical article on Medium →**](https://grossbelbir.medium.com/walrus-promise-technical-article-265c695ded5b)

Most AI chats are brilliant for five minutes and amnesiac tomorrow. They can help you make a plan, but when you return in a clean session they have forgotten the goal, the obstacle, and the promise that mattered.

**Walrus Promise fixes that.** It is a public accountability coach that turns a conversation into one compact, durable Promise Record. The record is encrypted with Seal, stored through Walrus Memory on Walrus Mainnet, and semantically recalled when it becomes relevant again. The transcript can disappear; the commitment survives.

The result feels less like reopening a chatbot and more like returning to a coach that was actually paying attention.

## The 60-second wow moment

1. Tell the coach: *“My goal is to launch my portfolio Friday. Today I promise to ship the first case study.”*
2. Wait for the **saved** card and its Walrus blob ID.
3. Press **New session**. The visible transcript is now empty.
4. Ask: *“What should I focus on today, and why?”*
5. Watch the coach recover the promise from Walrus and answer with the exact next step.

No login. No wallet connection for end users. No hidden transcript database.

Prefer zero typing? Press **Run Memory Demo**. The app autonomously:

1. creates a promise in session one;
2. waits for a Walrus blob receipt;
3. starts session two without the earlier transcript;
4. compares a generic baseline against a memory-aware answer;
5. displays the Mainnet blob ID and semantic recall distance.

The demo places the generic answer and the memory-aware answer side by side. It makes the value of durable AI memory visible instead of asking judges to trust a diagram.

## Why it is different

| Ordinary chatbot | Walrus Promise |
| --- | --- |
| Depends on an ever-growing transcript | Stores only compact, useful facts |
| Forgets after a clean session | Recalls goals and commitments across sessions |
| Memory lives in an opaque app database | Encrypted records are anchored on Walrus Mainnet |
| Generic advice every time | Advice grounded in the user's actual promise |
| “Trust us, memory works” | Shows blob receipts and recall distance in the UI |

Walrus is not decoration here. Remove Walrus Memory and the product's central experience—the fresh-session follow-up—stops working.

## Where this can be used

Walrus Promise is deliberately focused, but the memory pattern applies far beyond one coach:

- **Creator accountability** — remember publishing targets, blockers, and next drafts.
- **Study companions** — carry learning goals and progress across tutoring sessions.
- **Founder and team check-ins** — reconnect weekly conversations to previous commitments.
- **Career coaching** — remember applications, interview practice, and promised follow-ups.
- **Habit building** — preserve small commitments without retaining an entire private transcript.
- **Community bots** — give Discord, Telegram, or web agents portable long-term context.
- **Agent handoffs** — let a new workflow recover durable facts without sharing raw chat history.

The core primitive is simple: **store the promise, not the noise**.

## Hackathon proof, not hype

Three consented anonymous volunteers completed the public Mainnet write → fresh session → recall flow. All three final checks passed. The [real-user test report](docs/REAL_USER_TEST_REPORT.md) includes their evidence, honest limitations, and the reliability improvement triggered by the third tester's initial failure.

The production deployment has been exercised by an automated runner using ten clearly labelled synthetic personas:

- **10/10** isolated Mainnet memory writes reached `done`;
- **10/10** fresh-session queries recalled the expected marker;
- **10** unique Walrus blob receipts were produced;
- the built-in autonomous demo independently completed a Mainnet write and recall;
- **13/13** unit and integration tests pass.

Synthetic tests are never presented as real users. They prove the integration repeatedly; the three volunteer tests separately demonstrate human use.

## Tiny product, serious stack

Walrus Promise is intentionally compact: one Cloudflare Worker, one static page, no React, no database, no end-user accounts, and no paid services.

- **Interface:** TypeScript + semantic HTML + CSS + Vite
- **Runtime:** Cloudflare Workers Free
- **LLM:** `@cf/qwen/qwen3-30b-a3b-fp8`
- **Memory:** `@mysten-incubation/memwal`
- **Storage:** Walrus Mainnet
- **Encryption:** Seal
- **Retrieval:** MemWal semantic search
- **Cost target:** $0

Qwen keeps the project outside the OpenAI/Anthropic default and qualifies it for the hackathon's **Beyond the Big Two** track.

## Architecture

```text
Browser
  │ signed HttpOnly identity cookie
  ▼
Cloudflare Worker
  ├─ Qwen3-30B-A3B on Workers AI
  └─ MemWal SDK → managed Mainnet relayer
                    ├─ semantic embedding + pgvector index
                    ├─ Seal encryption
                    └─ encrypted blob on Walrus Mainnet
```

Every browser receives a signed, anonymous identity cookie. The Worker—not the client—derives its namespace:

```text
walrus-promise:user:<sha256(random-browser-identity)>
```

The browser cannot select or override a namespace. The current transcript remains in browser session storage and only the last eight messages are sent with a request. Long-term facts live in Walrus Memory.

### One chat turn

1. Validate the message and bounded history.
2. Derive the server-side user namespace.
3. Recall up to five semantically relevant memories.
4. Give Qwen the conversation plus an explicitly untrusted memory block.
5. Return the reply and, at most, one normalized durable fact.
6. Queue `remember()` with a deterministic idempotency key.
7. Poll the protected job endpoint until a Mainnet blob ID is available.

If recall fails, the coach still answers. Memory is an enhancement, never a single point of failure for the conversation.

## Privacy and security boundaries

- Anonymous identities are random UUIDs protected by an HMAC-signed `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Namespaces are derived on the server as `sha256(identity)` and never accepted from the browser.
- Memory-job polling requires a user-bound HMAC token, preventing cross-user receipt lookup.
- Recalled memories are treated as untrusted data and cannot override the system prompt.
- Only goals, constraints, commitments, preferences, and progress may become durable facts.
- Greetings, secrets, contact details, financial data, medical data, and declined memories are excluded.
- The revocable MemWal delegate key is a Cloudflare Secret. The owner wallet key never enters the app.
- Provider errors, prompts, namespaces, and credentials are never returned to the client.

## Local development

Prerequisites: Node.js 20 or newer.

```bash
npm install
npm test
npm run build
npx wrangler dev --local --var APP_ENV:development
```

Development uses the official deterministic `MemWalMock` and a local safe AI fallback. No blockchain writes or model charges occur.

## Free production setup

1. Create a free Cloudflare account and authenticate Wrangler.
2. Create a Walrus Memory Mainnet account and delegate key at `https://memory.walrus.xyz`.
3. Create a strong cookie secret locally.
4. Add all three values as Worker secrets:

```bash
npx wrangler secret put COOKIE_SECRET
npx wrangler secret put MEMWAL_PRIVATE_KEY
npx wrangler secret put MEMWAL_ACCOUNT_ID
```

5. Verify without publishing:

```bash
npm run check
npx wrangler deploy --dry-run
```

6. Deploy to the free `workers.dev` subdomain:

```bash
npm run deploy
```

Do not enable a paid Cloudflare plan. The reference deployment uses the Workers Free plan, Workers AI free allocation, Qwen3, and the Walrus Foundation managed Mainnet relayer.

## Environment and secrets

| Name | Purpose |
| --- | --- |
| `COOKIE_SECRET` | Signs anonymous browser identities; minimum 32 characters |
| `MEMWAL_PRIVATE_KEY` | Revocable MemWal delegate key; server only |
| `MEMWAL_ACCOUNT_ID` | Mainnet MemWalAccount object ID |
| `MEMWAL_SERVER_URL` | Defaults to `https://relayer.memory.walrus.xyz` |
| `APP_ENV` | Must remain `production` in the deployed Worker |

Never use the owner wallet key as the application delegate key. Never commit `.dev.vars`, environment files, screenshots containing secrets, or evidence reports containing operational identifiers.

## API

- `POST /api/chat` — recalls relevant memory, generates a reply, and optionally queues one durable fact.
- `GET /api/memory-jobs/:jobId?token=...` — exposes progress only to the anonymous browser that created the write.
- `POST /api/demo/run` — runs the autonomous two-session before/after demonstration.
- `GET /api/health` — reports model, memory, environment, and network status without configuration values.

Requests accept at most eight history messages and 2,000 characters per message. The Worker stores no transcript.

## Automated Mainnet evidence

After deployment, the runner creates exactly ten isolated synthetic personas, waits for ten durable blobs, opens fresh sessions, verifies recall, and writes a private JSON report.

```bash
EVIDENCE_BASE_URL=https://walrus-promise.<account>.workers.dev \
CONFIRM_MAINNET_EVIDENCE=YES \
npm run evidence:mainnet
```

The runner is intentionally gated because it creates real Mainnet memories. Its output explicitly labels the personas synthetic and must not be presented as real-user evidence.

## Quality checks

```bash
npm run check
```

The test suite covers signed identities, namespace separation, input limits, both Workers AI response formats, model-output validation, stored prompt-injection boundaries, protected job polling, cross-user isolation, memory across clean requests, production fail-closed behavior, and the complete autonomous demo.

## Official references

- [Chatbots That Remember rules](https://thewalrussessions.wal.app/chatbots/index.html)
- [Walrus Memory documentation](https://docs.wal.app/walrus-memory/)
- [MemWal SDK](https://github.com/MystenLabs/MemWal)
- [Cloudflare Workers guide](https://docs.wal.app/walrus-memory/sdk/cloudflare-workers)
- [Sui documentation](https://docs.sui.io/)

## Built for The Walrus Sessions

Walrus Promise was built for **Chatbots That Remember**. It demonstrates the property the track is really about: not merely writing a blob, but using durable decentralized memory to make the next conversation materially better.

If the first generation of chatbots could talk, the next generation should be able to **keep a promise**.
