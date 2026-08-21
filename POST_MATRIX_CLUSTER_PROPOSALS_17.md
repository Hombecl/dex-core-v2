# Post-matrix cluster proposals 17

The AD cells are closed. This expansion drills the remaining shared payout
handlers with fresh message-order and recipient-binding questions. Each cell
still requires a production-reachable call chain, direct balance/state delta,
caller evidence, cascade hits, prior-art trace, and an on-disk PoC run log.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AE1 | pool_swap_referral_output_send_order | When a swap has a referral fee, can the pool’s referral-vault message and normal output message diverge in amount, token side, or completion while the pool saves reserves after both sends? | liveness-only if both messages remain independently amount-bound and the saved reserve delta matches each leg |
| AE2 | pool_protocol_fee_dual_payload_delivery | Can protocol-fee collection’s two independently wrapped payloads or two sequential router pay_to messages alter the fee recipient, leg identity, or counter clearing after one downstream leg fails? | payload-only if both token amounts and the protocol recipient remain static and counters clear exactly once |
| AE3 | router_notification_without_ref_refund_source | Can a no-reference jetton transfer notification make Router issue a token refund to an attacker-shaped sender/from tuple without a valid Router token-wallet identity? | no asset delta if the destination is not Router-owned or the wallet caller check rejects the message |
| AE4 | router_vault_pay_to_recipient_stateinit | Can a vault_pay_to body tuple pass the derived-vault sender check while redirecting the stored referral amount to a different token wallet or owner? | identity-only if state-init derivation binds owner, token, router, and the outgoing transfer recipient |
| AE5 | lp_wallet_transfer_response_excess_commit | Can LP-wallet send_tokens commit a debit while response/excess handling or a forward-payload boundary causes a duplicate credit, wrong response recipient, or unaccounted transfer? | TON-only if the jetton amount is debited once and the deployed destination wallet is deterministic |

Auto-pick: AE1. It is the strongest remaining external-value path because one
user swap crosses Pool → Router → Vault plus the normal output Router path,
and Pool reserve state is persisted only after both outbound messages are
constructed.
