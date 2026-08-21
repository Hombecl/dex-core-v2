# Post-matrix cluster proposals — Iter 193+

AR1–AR5 are all completed dead ends. Fresh clusters:

| Cell | Production mechanism P | Failure class C | Hypothesis | Priority | Decision |
|---|---|---|---|---:|---|
| AS1 | router_pay_to_cross_swap_recursion | async_reentry / amount_conservation | A Pool-controlled `pay_to` custom payload can select `cross_swap`, causing Router output handling to recurse into a second route while the first output balance/state transition is still in flight. | 1 | AUTO-PICK |
| AS2 | lp_burn_dual_output_bounce_correlation | bounce_accounting | The two burn `pay_to` legs use separate messages and carry modes; a bounce or partial receiver failure could restore one wallet-side amount while Pool reserves/supply remain committed. | 2 | pending |
| AS3 | router_pay_vault_vault_collision | state_init_alias | A `pay_vault` token/owner tuple may collide with a real Vault or LP wallet StateInit, redirecting a referral-fee deposit across selected assets. | 3 | pending |
| AS4 | pool_upgrade_ref_partial_state | upgrade_state | Admin Pool code-update messages may change executable code without a synchronized static/storage reference, creating a value-bearing callback interpretation split. | 4 | pending |
| AS5 | getter_wallet_address_code_identity | state_init_alias | Getter-derived LP wallet addresses may diverge from mint/burn StateInit code/data after variant selection, causing an output to reach a different wallet identity. | 5 | pending |

AS1 is selected because it is externally reachable through Pool-produced custom payloads and joins Router pay_to, cross-swap routing, and token-wallet balance conservation across the selected contract family.
