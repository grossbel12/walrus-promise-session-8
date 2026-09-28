# Walrus Promise

Walrus Promise is a public accountability coach that remembers goals, constraints, and commitments across clean browser sessions. Durable facts are encrypted with Seal, stored through Walrus Memory on Walrus Mainnet, and recalled before Qwen generates the next answer.

Live app: [walrus-promise.walrus-promise-lab.workers.dev](https://walrus-promise.walrus-promise-lab.workers.dev)

The project is intentionally small: one Cloudflare Worker, one static page, no database, no user accounts, and no paid services.

## What makes the demo convincing

Press **Run Memory Demo**. The app:

1. creates a promise in session one;
2. waits for a Walrus blob receipt;
3. starts session two without the earlier transcript;
4. compares a generic baseline against a memory-aware answer;
5. displays the blob ID and recall distance.

The ordinary chat follows the same architecture. **New session** clears only the browser transcript; the signed anonymous identity and Walrus memories remain.

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

Every user gets a server-derived namespace:

```text
walrus-promise:user:<sha256(random-browser-identity)>
```

The browser cannot select a namespace. A namespace is an organization boundary, so all mapping is enforced server-side. Recalled text is explicitly treated as untrusted factual data, never as instructions.

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

Do not enable a paid Cloudflare plan. The deployment uses the Workers Free plan, Workers AI free allocation, Qwen3, and the Walrus Foundation managed Mainnet relayer.

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

The test suite covers signed identities, namespace separation, input limits, model-output validation, stored prompt-injection boundaries, job polling, cross-user isolation, memory across clean requests, and the complete autonomous demo.

## Official references

- [Chatbots That Remember rules](https://thewalrussessions.wal.app/chatbots/index.html)
- [Walrus Memory documentation](https://docs.wal.app/walrus-memory/)
- [MemWal SDK](https://github.com/MystenLabs/MemWal)
- [Cloudflare Workers guide](https://docs.wal.app/walrus-memory/sdk/cloudflare-workers)
- [Sui documentation](https://docs.sui.io/)

Walrus Promise uses Qwen rather than OpenAI or Anthropic and is eligible for the hackathon's **Beyond the Big Two** track.
