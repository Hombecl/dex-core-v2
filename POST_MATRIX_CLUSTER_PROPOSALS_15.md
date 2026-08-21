# Post-matrix cluster proposals 15

The AB arithmetic, cross-router identity, LP-wallet conservation, and vault
payload cells are closed. These AC cells pivot to pair orientation, exact fee
rounding, callback lifecycle, payload-reference depth, and concurrent vault
state transitions.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AC1 | router_pool_pair_orientation_stateinit | Can reversing token-wallet order between router routing, pool state-init, and pay_to token fields make a valid pool send one asset under the other asset’s wallet? | none until pair-order trace |
| AC2 | pool_swap_fee_rounding_zero_output | Can fee/referral rounding at exact small outputs subtract more than the computed output or bypass the positive-output/refund invariant? | arithmetic-only if no asset delta |
| AC3 | lp_account_refund_then_direct_add_lifecycle | Can a failed minimum-LP callback followed by direct add/refund ordering reuse stale LP-account amounts or mint against cleared state? | none until message-order trace |
| AC4 | lp_wallet_forward_payload_reference_depth | Can nested forward-payload reference depth or trailing bits alter the owner notification while leaving the LP debit committed? | parser-only if sender/balance invariants hold |
| AC5 | vault_concurrent_deposit_withdraw_transition | Can permissionless withdrawal interleave with a router deposit so the stored amount is paid twice or a deposit is lost across save/clear ordering? | none until transaction-order trace |

Auto-pick: AC1, because pair orientation is externally exercised across every
pool family, spans router/pool/pay_to/state-init layers, and can directly change
which token wallet receives a protocol-held asset.
