# Post-matrix cluster proposals — expansion set 4

These candidates remain within the selected five contract entrypoints and focus on state-write timing, callback boundaries, and arithmetic not covered by the prior rows.

| Cluster | Label | Primary axis | Hypothesis | EV rationale |
|---|---|---|---|---|
| R11 | swap_catch_state_rollback | state_persistence | Swap reserve/fee mutations made before a caught validation failure remain persisted or interact with the refund action, creating an extractable reserve drift. | Highest EV: state mutation, catch path, refund output, and final save are crossed in one path. AUTO-PICK. |
| R12 | provide_catch_state_rollback | bounce_reversal | Liquidity-provision state changes before deadline/min-liquidity failure survive the catch branch while input tokens are refunded. | Distinct add-liquidity rollback and LP-account callback boundary. |
| R13 | route_token_wallet_binding | sender_binding | Router route selection accepts a body-supplied token-wallet pair that can redirect a valid transfer into an existing pool or mismatched pool. | Reopens route selection with deterministic pool and notification sender anchors. |
| R14 | referral_fee_arithmetic_overflow | amount_conservation | Referral/protocol fee splitting or sum checks overflow/truncate at boundary values, creating output or fee extraction. | Fee arithmetic feeds reserves, vault deposits, and collection. |
| R15 | upgraded_pool_address_binding | state_persistence | Pool-code staging/finalization leaves router derivation and deployed pool code inconsistent, allowing a second pool identity or bypass of upgraded sender checks. | Upgrade state plus deterministic address and callback validation. |

AUTO-PICK: R11 swap_catch_state_rollback.
