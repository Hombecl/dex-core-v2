# Post-matrix cluster proposals — Iter173+

AN1–AN5 are exhausted with verified dead ends. These fresh clusters pivot to untested Pool/Router/Vault state transitions and message-boundary behavior.

| Cell | New production mechanism | Failure class | Hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AO1 | pool_swap_trycatch_reserve_rollback | state_rollback | The Pool swap branch mutates reserves and protocol/referral fee counters before postcondition checks inside a try/catch; a caught failure could persist a partial state update or create a reserve/fee mismatch while the Router refunds the input. | 1 | auto-picked |
| AO2 | router_pay_vault_token_side_binding | asset_binding | Router pay_vault derives one Vault from owner, the selected token side, and Router, then deposits amount0_out + amount1_out; a mixed-side payload or selector mismatch could credit one token’s Vault with another side’s amount. | 2 | pending |
| AO3 | vault_withdraw_owner_token_router_binding | withdrawal_identity | Anyone may trigger a Vault withdrawal, while the Vault sends the balance to its owner through Router; a StateInit tuple or token/router mismatch could redirect accrued referral fees. | 3 | pending |
| AO4 | router_transfer_bounce_refund_payload | bounce_refund | Router transfer-bounce handling derives refund/excess destinations from user-controlled DexPayload fields and emits a jetton transfer on caught validation errors; a bounce-path field shift could send returned tokens to the wrong identity. | 4 | pending |
| AO5 | pool_protocol_fee_dual_leg_release | fee_release | Pool collect_fees requires both protocol-fee legs to be positive, clears both counters after two Router pay_to messages, and relies on asynchronous delivery; a zero-leg or partial-send path could strand or duplicate one fee leg. | 5 | pending |

## Selection rationale

AO1 has the highest expected value because it directly tests whether a failed swap can leave persisted reserve/fee state after the Pool has already emitted a refund. The first pass will combine source-order assertions, bounded state models, and live expiry/slippage/refund paths across every pool variant.
