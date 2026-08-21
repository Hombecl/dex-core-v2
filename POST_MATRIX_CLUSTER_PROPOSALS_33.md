# Post-matrix cluster proposals — Iter 208+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AV1 | vault_withdraw_destroy_redeposit_code_identity | lifecycle / state_init_alias | Vault withdrawal uses `DESTROY_IF_ZERO` while clearing deposited state; a destroy/redeploy boundary could reuse a stale owner/token/router tuple or expose a prior deposited amount. | 4 | queued |
| AV2 | lp_wallet_send_tokens_stateinit_bounce_debit_restore | bounce_accounting / async_message_ordering | LP-wallet transfer debits before emitting a StateInit-backed internal transfer; a deployment or bounce boundary could restore the wrong amount or leave a debit without the matching destination wallet credit. | 1 | auto-picked |
| AV3 | router_notification_ref_forward_payload_boundary | parser_boundary / branch_selection | A transfer notification with a ref whose payload is empty, truncated, or nested could cross the Router route/refund branch with a shifted caller or token-wallet identity. | 3 | queued |
| AV4 | pool_pay_vault_both_positive_side_selector | asset_binding / amount_conservation | If both referral-fee legs are positive, Router selects the Vault token by `amount0_out > 0` while depositing their sum; a dual-leg case could aggregate two token assets into one Vault. | 2 | queued |
| AV5 | router_vault_getter_addr_none_identity | read_only_boundary / state_init_alias | Router’s Vault address getter may accept unusual owner/token address forms differently from the value-bearing `vault_pay_to` sender check and derive a misleading Vault identity. | 5 | queued |

Selection record: AV2 was auto-picked as the highest-EV fresh cell because it spans LP-wallet balance debit, StateInit deployment, bounce handling, and a selected-asset value credit. No user decision was requested.
