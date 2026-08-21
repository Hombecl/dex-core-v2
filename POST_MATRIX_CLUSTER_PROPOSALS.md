# Post-matrix cluster pivot — Iter 50 exhaustion

Initial matrix result: 50/50 cells closed as `DEADEND_WITH_PROOF`; no shadow candidate met shippable H/C evidence requirements. The following five clusters are newly proposed from unresolved cross-file seams.

| Cluster | New hypothesis | EV rank | Selection disposition |
|---|---|---:|---|
| Q1 notification identity / owner binding | `router/msgs/jetton.fc` may route a transfer notification using a body-supplied `from_address` without authenticating the notification sender or owner; combine with existing pool callbacks to test whether a forged owner can receive or control real-pool value. | 1 | **AUTO-PICK** |
| Q2 state-init identity collision | Pool, LP-account, LP-wallet, and vault deterministic address derivations may disagree across token ordering or code cells, allowing a message accepted by one component to target another component's state. | 2 | Pending after Q1 |
| Q3 callback payload aliasing | `router/msgs/pool.fc` and `pool/msgs/router.fc` may bind the callback sender but not every nested amount/recipient field; test `pay_to`, `pay_vault`, and refund payloads for cross-operation asset routing. | 3 | Pending after Q1 |
| Q4 rate-transition boundary | Weighted-stableswap `set_params` / setter transitions may have edge values or ordering that change live pricing without atomic validation; trusted-role impact is filtered unless an external caller can trigger it. | 4 | Pending after Q1 |
| Q5 TON reserve / carry value flow | Repeated getter/refund/callback messages may bypass the intended `reserves::max_balance` floor or carry excess TON across a failed path; test balance deltas separately from jetton deltas. | 5 | Pending after Q1 |

Selection rationale: Q1 has the strongest unresolved external-input seam and the clearest path to a concrete multi-contract asset-flow test. It is the next one-cell drill; no emission or downstream queue action is authorized in shadow mode.
