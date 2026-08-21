# Second post-matrix cluster pivot — Iter 55 exhaustion

Q1–Q5 all closed as `DEADEND_WITH_PROOF`. New narrower seams:

| Cluster | New hypothesis | EV rank | Selection disposition |
|---|---|---:|---|
| R1 protocol-fee callback | Protocol-fee collection may alias the configured fee recipient, amount fields, or payout callback and move accrued fees to an unintended address. | 2 | Pending |
| R2 LP-burn notification | Burn notification `from_address`/response fields may let a callback reach the wrong LP wallet or recipient. | 3 | Pending |
| R3 refund-account substitution | A failed LP add may create a new LP account keyed by `refund_address`; body-field aliasing could store or release deposited tokens under the wrong owner. | 1 | **AUTO-PICK** |
| R4 code-upgrade rollback | Upgrade/cancel/finalize message ordering may leave a partially updated code/state tuple reachable by an external message. | 4 | Pending; trusted-admin filter applies |
| R5 unknown-op bounce typing | Unknown or malformed operation bodies may enter an accepted bounce/reversal branch and mutate balance. | 5 | Pending |

Selection rationale: R3 is the highest-EV unresolved user-fund seam because it combines a failed path, state-init creation, refund recipient, and LP-account ownership across four selected contracts. The drill begins in shadow mode with no emission.
