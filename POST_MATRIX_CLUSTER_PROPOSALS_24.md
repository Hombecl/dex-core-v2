# Post-matrix cluster proposals — Iter163+

AK1–AK5 are exhausted with verified dead ends. These are fresh clusters centered on the outbound LP mint boundary and its asynchronous commit behavior.

| Cell | New production mechanism | Failure class | Hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AM1 | lp_mint_bounce_pool_commit | bounce_accounting | Pool callback commits LP supply/reserves before the outbound LP-wallet mint is durably credited; a bounce or receiver-side failure could leave value-bearing pool state without the corresponding LP balance. | 1 | auto-picked |
| AM2 | lp_mint_notification_failure | async_message_ordering | A user-controlled forward amount/payload can make the LP-wallet transfer notification fail after LP balance credit, causing a mismatch between minted LP and notification-side state. | 2 | pending |
| AM3 | lp_account_zero_lp_donation_price | accounting_conservation | A zero-minimum LP provide that returns zero liquidity can still add reserves, potentially shifting the pool price/invariant for existing LPs without a share issuance. | 3 | pending |
| AM4 | lp_wallet_invalid_owner_state_init | destination_binding | An unvalidated LP recipient form could produce a wallet StateInit that is unreachable or aliases a different owner while the Pool has already committed LP supply. | 4 | pending |
| AM5 | lp_mint_carry_value_commit | gas_accounting | CARRY_ALL_BALANCE on the LP mint path could alter bounce/value behavior so a successful Pool save is followed by an incomplete mint or residual-value diversion. | 5 | pending |

## Selection rationale

AM1 has the highest expected value because it joins the LP-account callback, Pool state persistence, LP-wallet internal transfer, and bounce restoration in one value-bearing path. It will be tested against sender/state-init identity, bounce opcodes, balance deltas, and live LP provide integration.

