# Post-matrix cluster proposals 5

R1–R15 are exhausted as dead ends. The next expansion uses distinct call paths and auto-picks S1 for the highest expected value because it joins the user-gated LP-account path, pool callback, state clearing, and LP-wallet mint/refund in one direct-liquidity flow.

| Cluster | Label | Primary layer | Hypothesis | EV rank | Dispatch |
|---|---|---|---|---:|---|
| S1 | direct_add_liquidity_identity_clearance | sender_binding | Direct user-triggered LP-account additions can use stale accumulated amounts or mismatched refund/excess fields after the callback clears account state. | 1 | COMPLETED DEADEND → Iter 71 |
| S2 | direct_refund_me_bounce_replay | bounce_reversal | A user-triggered LP-account refund clears balances before a downstream router payment, and a bounce or repeated refund can duplicate or strand the refund. | 2 | COMPLETED DEADEND → Iter 72 |
| S3 | lp_wallet_forward_payload_balance | amount_conservation | LP-wallet receive-notification forwarding can alter balance or owner notification semantics when forward gas/payload fields are edge-sized or malformed. | 3 | COMPLETED DEADEND → Iter 73 |
| S4 | protocol_fee_dual_leg_clearance | message_ordering_fees | Two-sided protocol-fee collection or a zero leg can clear accounting before one downstream token payment, causing fee loss or double collection. | 4 | COMPLETED DEADEND → Iter 74; one-sided protocol fee can remain uncollectable until the other side accrues |
| S5 | getter_static_code_identity | state_persistence | Getter-derived pool/LP-wallet addresses diverge from runtime static identity after a pool code upgrade, exposing an address alias used by a stateful caller. | 5 | COMPLETED DEADEND → Iter 75 |
