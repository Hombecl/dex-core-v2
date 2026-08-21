# Post-matrix cluster proposals — Iter 213+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AW1 | router_pay_vault_stateinit_bounce_fee_stranding | bounce_accounting / async_commit | Pool commits swap/referral accounting before Router sends a StateInit-backed Vault deposit; a deposit bounce or deployment boundary could strand the referral fee after reserve mutation. | 1 | auto-picked |
| AW2 | vault_deposit_ref_fee_tail_response_isolation | parser_boundary / excess_routing | Vault parses amount and response address without `end_parse`; trailing body data might shift excess routing or persist an amount with an unintended response field. | 3 | queued |
| AW3 | lp_wallet_master_source_auth_alias | sender_auth / state_init_identity | LP-wallet `receive_tokens` accepts either the configured master or the deterministic source wallet; a source/master tuple edge could credit a wallet under an unintended owner. | 2 | queued |
| AW4 | pool_root_lp_wallet_lp_account_opcode_collision | dispatcher_order / caller_gate | Pool dispatches LP-wallet messages before LP-account messages; an opcode overlap or short body could reach the wrong handler before sender validation. | 4 | queued |
| AW5 | router_vault_code_upgrade_identity_drift | upgrade_lifecycle / address_replay | A Router vault-code upgrade could make existing Vault StateInit addresses diverge from future deposits/withdrawals, stranding or cross-binding referral balances. | 5 | queued |

Selection record: AW1 is auto-picked as the highest-EV fresh cluster because it crosses Pool reserve/referral accounting, Router `pay_vault`, Vault deposit authentication, StateInit deployment, and bounce behavior. External referral-fee loss would require a production-reachable downstream bounce; trusted code-upgrade paths remain separate and are not assumed.
