# Post-matrix cluster proposals 6

The S-cluster expansion is complete with no shippable candidate. The next expansion focuses on distinct multi-hop and message-composition paths. T1 is auto-picked because nested cross-swap payloads traverse two router instances and two pool callbacks before final refund/output routing.

| Cluster | Label | Primary layer | Hypothesis | EV rank | Dispatch |
|---|---|---|---|---:|---|
| T1 | cross_swap_nested_refund_binding | sender_binding | Nested cross-swap payloads can substitute the final receiver/refund/excess identity across router hops while retaining a valid pool-sender chain. | 1 | Iter 76 DEADEND_WITH_PROOF |
| T2 | burn_dual_output_bounce_accounting | bounce_reversal | Two burn output messages can diverge under a bounce, leaving LP supply/reserves committed while one token leg is unpaid or replayable. | 2 | Iter 77 DEADEND_WITH_PROOF |
| T3 | referral_vault_deposit_replay_identity | message_ordering_fees | Referral-vault deposits accept a repeated or mismatched token/owner tuple that credits the wrong vault or makes a deposit claimable twice. | 3 | Iter 78 DEADEND_WITH_PROOF |
| T4 | initial_liquidity_minimum_boundary | arithmetic_overflow | Initial-liquidity subtraction of required minimum supply can create an underflow/zero-mint state that bypasses reserve or LP supply checks. | 4 | Iter 79 DEADEND_WITH_PROOF |
| T5 | pay_to_dual_leg_cross_route | amount_conservation | A malformed `pay_to` with both output legs positive can select one token for a nested cross-swap while summing both amounts, creating a cross-route amount mismatch. | 5 | AUTO-PICK → Iter 80 |
