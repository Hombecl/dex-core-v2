# Post-matrix cluster proposals — expansion set 3

All proposals stay inside the selected `lp_account.fc`, `lp_wallet.fc`, `pool.fc`, `router.fc`, and `vault.fc` contract surface. One-cell execution continues in the next iteration.

| Cluster | Label | Primary axis | Hypothesis | EV rationale |
|---|---|---|---|---|
| R6 | vault_withdraw_bounce_replay | bounce_reversal | A public `withdraw_fee` clears vault accounting before downstream `vault_pay_to` delivery, allowing a bounce/replay to lose or duplicate referral-fee value. | Highest EV: public caller, cross-contract state reset, and token delivery boundary. AUTO-PICK. |
| R7 | vault_state_init_owner_token_collision | state_persistence | Owner/token/router ordering or state-init reuse maps a referral vault deposit or withdrawal to another vault’s stored owner. | Cross-file deterministic address and persisted owner/token tuple. |
| R8 | lp_wallet_receive_master_alias | sender_binding | LP-wallet `internal_transfer` sender alternatives let a body-supplied `from_address` authorize a forged balance credit or bypass the owner/master boundary. | Direct wallet balance mutation with master-or-wallet sender branch. |
| R9 | router_pay_to_zero_leg | amount_conservation | A `pay_to` message with both output legs zero or malformed token addresses can consume router gas/state without a matching source-pool debit, or alias one leg into the other. | Shared transfer primitive used by swaps, burns, refunds, and fees. |
| R10 | pool_router_message_replay | message_ordering_fees | Replaying a valid router callback or reusing a query id can apply a swap/provide/burn state transition twice. | Broad callback fan-out and pool state mutation boundary. |

AUTO-PICK: R6 vault_withdraw_bounce_replay.
