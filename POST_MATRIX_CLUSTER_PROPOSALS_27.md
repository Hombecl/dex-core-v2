# Post-matrix cluster proposals — Iter178+

AO1–AO5 are exhausted. AG5 remains pending but overlaps the previously audited
carry family (Iter99/X4), so this set pivots to distinct Pool burn and callback
boundaries before returning to AG5.

| Cell | New production mechanism | Failure class | Hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AP1 | pool_burn_response_addr_none_gate | destination_binding | The LP-wallet burn callback accepts only `addr_none()` as `response_address`; a parser/tag boundary could admit a noncanonical response identity or reject a valid burn after Pool state has been debited. | 1 | auto-picked |
| AP2 | lp_account_cb_refund_dual_leg_mode_split | gas_accounting | The Pool refund callback uses NORMAL for two positive legs and CARRY_REMAINING_GAS for a one-sided leg; a boundary could underfund or duplicate the second token refund after LP-account state is cleared. | 2 | pending |
| AP3 | pool_provide_callback_to_user_deferred_wallet | destination_binding | The authenticated LP-account user and the separately selected `to_user` LP-wallet owner could diverge at the callback, causing a committed LP mint to become unreachable or credited to an unintended wallet. | 3 | pending |
| AP4 | vault_withdraw_permissionless_replay | replay_correlation | Permissionless Vault withdrawal could replay a stored referral amount or race the zeroing save so one accrued fee is paid twice. | 4 | pending |
| AP5 | router_vault_pay_to_amount_tuple | asset_binding | A `vault_pay_to` amount/token/owner tuple could be accepted from a deterministic Vault while selecting the wrong token wallet or amount for the stored referral fee. | 5 | pending |

## Selection rationale

AP1 has the highest expected value because it sits after LP supply/reserve
debit and before two Router token payouts. The first pass will compare the
response tag/parser gate, the deterministic LP-wallet sender, both payout legs,
and bounced/invalid burn cases across the selected Pool family.
