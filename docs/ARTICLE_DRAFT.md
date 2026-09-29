# The promise a chatbot remembered after the conversation disappeared

Most chatbots can sound intelligent for ten minutes and become strangers the moment a conversation closes. Walrus Promise is a small accountability coach built around one question: can a chatbot remember a commitment after its transcript is gone, and use that commitment to make the next conversation more useful?

The interface is deliberately simple. A visitor writes a goal, the obstacle in the way, and one action they can take today. The coach replies briefly and extracts at most one durable fact: a goal, constraint, commitment, preference, or progress update. It does not save the entire conversation. A button starts a clean session, removing the local transcript while keeping the anonymous browser identity. When the visitor asks what to do next, the coach searches Walrus Memory and grounds its answer in the earlier promise.

## Before memory

Without long-term memory, the question “What should I focus on today?” produces sensible but generic advice. The model does not know that the user plans to publish an accessibility portfolio on Friday, that perfectionism is the obstacle, or that they promised to spend thirty minutes shipping the first case study.

## After memory

With Walrus Memory enabled, the same question in a fresh session retrieves that commitment. The response can now say exactly why the first case study matters and remind the user of the thirty-minute promise. The language model has not become larger. It has become situated in the user's history.

Walrus Promise includes an autonomous demonstration so this difference is reproducible. One click runs session one, waits for the memory write to finish, discards the transcript, recalls the fact in session two, and displays baseline and memory-aware answers side by side. The page also shows the Walrus blob ID and semantic recall distance.

## How it works

The application is a single Cloudflare Worker with a static TypeScript interface. Qwen3-30B-A3B runs through Workers AI. This avoids an OpenAI or Anthropic dependency and keeps the project inside free service limits.

The Worker assigns every browser a signed anonymous identity cookie and derives a stable MemWal namespace from its hash. The client never supplies a namespace, which prevents one visitor from selecting another visitor's memory bucket. Before every model response, the Worker calls `recall` with the new message and injects up to five relevant memories into a clearly marked untrusted-data block. Stored text is treated as fact, never as an instruction, to reduce the risk of persistent prompt injection.

The model returns one structured response containing both the visible reply and an optional normalized memory. If a useful fact exists, the Worker sends it to the managed Walrus Memory Mainnet relayer with an idempotency key. The relayer embeds the text, encrypts it through Seal, uploads the encrypted blob to Walrus, and indexes the vector for semantic retrieval. The UI polls the memory job and displays the final blob receipt.

No application database stores conversations. Local chat history can disappear while the encrypted, portable memory remains available through Walrus.

## What was harder than expected

Memory writes are asynchronous. An accepted write is not proof that a new session can recall it immediately. The demo therefore uses `rememberAndWait`, while ordinary chat exposes job progress and never pretends a pending write is durable.

The second challenge is memory quality. Saving every sentence would create noise and cost. Walrus Promise stores only one compact durable fact per turn. Exact duplicates share an idempotency key. Recall is capped and memories are separated from executable instructions in the prompt.

The third challenge is honest evidence. The automated test runner creates ten synthetic personas to verify ten Mainnet writes and fresh-session recalls. Those personas are explicitly labelled synthetic; they prove the storage loop, not real-user adoption.

## What three real testers found

Three volunteers then tested the public deployment and consented to anonymous use of their screenshots. All three ultimately completed the full proof loop: a confirmed Mainnet blob, a clean session, and a correct recall. Their semantic recall distances were 0.703, 0.729, and 0.764. This human evidence is reported separately from the 10/10 synthetic runner results.

The most useful test was not initially successful. The third tester hit a transient coach error and later saw writes remain pending while the managed relayer was reachable but not write-ready. That failure revealed that the interface was calling an accepted asynchronous job “saved” too early. The deployed fix added a bounded AI retry, isolated memory-write failure from the chat response, extended polling, surfaced relayer degradation, and reserved `SAVED` for jobs with a final blob ID. The same tester then repeated the flow successfully and recalled the stored promise in a fresh session.

This was exactly the kind of feedback the project needed: not a cosmetic opinion, but a real failure that made the durability claim more accurate.

## What changed

Walrus Memory changes the coach from a blank slate into a continuing relationship. The interesting moment is not when a dashboard says that a blob exists. It is when a user asks a vague question days later and receives an answer anchored in a promise they made before the current conversation existed.

That is the entire product thesis of Walrus Promise: your transcript can disappear, but your commitment does not have to.
