# Real-user test report

## Summary

On September 29, 2026, three volunteer testers used the public Walrus Promise deployment. The project owner confirmed that all three participants consented to anonymous use of their screenshots in the hackathon materials.

Each successful test followed the same acceptance flow:

1. state a goal or commitment;
2. wait for a confirmed Walrus receipt with a blob ID;
3. start a fresh session, clearing the local transcript;
4. ask the coach what was promised;
5. verify that the earlier commitment is recalled.

## Results

| Tester | Mainnet write | Fresh-session recall | Recall distance | Evidence |
| --- | --- | --- | ---: | --- |
| Anonymous tester 1 | Confirmed with blob ID | Pass | 0.703 | [Screenshot](evidence/real-testers/tester-01-success.png) |
| Anonymous tester 2 | Confirmed with blob ID | Pass | 0.729 | [Screenshot](evidence/real-testers/tester-02-success.png) |
| Anonymous tester 3 | Confirmed with blob ID after the relayer recovered | Pass | 0.764 | [Screenshot](evidence/real-testers/tester-03-success-after-fix.png) |

Final result: **3/3 participants completed a successful Mainnet write and fresh-session recall.**

The screenshots are intentionally anonymous. They demonstrate the product state, saved receipt, blob identifier, recalled record, and semantic distance without exposing participant identities. Participation and consent are recorded from the project owner's attestation; no names, accounts, or device fingerprints were collected.

## Friction discovered by a real tester

Tester 3 initially received `The coach could not answer right now`, followed later by memory jobs that remained in `pending` while the managed relayer reported `write_ready: false`.

- [Initial failure screenshot](evidence/real-testers/tester-03-initial-failure.png)
- [Successful retest after the fix](evidence/real-testers/tester-03-success-after-fix.png)

This exposed two misleading states in the first UI version: a transient AI failure was not retried, and an accepted asynchronous memory job was labelled `SAVED` before a blob ID existed.

The deployed fix now:

- retries one transient Workers AI failure before showing an error;
- keeps the coach usable when the memory write path fails;
- labels accepted writes as `PENDING`, not `SAVED`;
- polls for up to 90 seconds and changes delayed jobs to `STILL PROCESSING`;
- reports `Memory degraded` when the relayer is reachable but not write-ready;
- shows `SAVED` only after a terminal `done` status returns a blob ID.

The successful retest proves that the original commitment was eventually durable and recallable in a fresh session.

## Relationship to synthetic evidence

These tests are separate from the automated evidence runner. The runner produced 10/10 synthetic Mainnet writes and 10/10 fresh-session recalls to validate the integration repeatedly. The three tests in this report represent voluntary human use and are not counted as synthetic personas.

## Evidence limitations

This is a small qualitative MVP test, not an adoption study. The report does not claim verified identities, unique devices, demographic diversity, or long-term retention. It claims only what the supplied evidence supports: three consented anonymous participants completed the demonstrated flow, and all three final recall checks passed.
