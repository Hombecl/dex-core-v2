# Post-matrix cluster proposals — Iter 198+

| Cell | Production mechanism P | Failure class C | Hypothesis | EV | Selection |
|---|---|---|---|---:|---|
| AT1 | router_notification_no_ref_wallet_refund | sender_binding / amount_conservation | A no-reference transfer notification may refund from_address through the notifying wallet without proving the notifying wallet is the Router-owned token wallet, producing a cross-wallet refund. | 3 | pending |
| AT2 | lp_account_refund_destroy_redeploy_identity | lifecycle / replay_correlation | `CARRY_ALL_BALANCE | DESTROY_IF_ZERO` on refund may race the post-send zero/save transition so a redeployed LP account retains stale liquidity or can replay a refund. | 4 | pending |
| AT3 | lp_account_direct_add_zero_selector_residual | amount_conservation / branch_selection | Direct-add treats a zero requested amount as “use all stored amount”; a mixed zero/nonzero selector could subtract one full stored leg while retaining or misrouting the other leg across the Pool callback. | 1 | auto-picked |
| AT4 | pool_callback_minimum_zero_selector | accounting_conservation / minimum_output | A zero minimum or one-sided callback tuple may allow a Pool callback to commit token reserves while minting no LP or route an unintended side through the LP-account fallback. | 2 | pending |
| AT5 | router_pay_to_empty_custom_payload_ref | parser_boundary / async_message_ordering | An empty or malformed custom-payload reference at Router pay_to may switch between transfer and route handling while preserving a stale amount/token side. | 5 | pending |

Selection rationale: AT3 is closest to a direct externally-triggered LP-account state transition and has a concrete amount-conservation invariant, so it is the next cell.
