# Post-matrix cluster proposals 11

Surface exhaustion after X5 is recorded. These five new cells are selected from
unclosed message-boundary and state-init composition paths in the five scoped
entry contracts; each remains subject to the same caller, PoC, cascade, and
R15 gates.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| Y1 | router_pay_vault_single_side_stateinit | Does `pay_vault` accept an attacker-controlled two-sided/zero-sided amount tuple or derive a token vault inconsistent with the originating pool, allowing real token release? | trusted-on-trusted if only pool-authenticated |
| Y2 | router_route_untrusted_notification_binding | Does an untrusted `transfer_notification` sender/from-address combination cross the router's token-wallet, pool, or refund identity boundaries into value movement? | single-by-design if no legitimate wallet source |
| Y3 | lp_wallet_forward_payload_dict_boundary | Does the ignored `custom_payload` dictionary in `send_tokens` alter parsing, forwarding, or balance restoration across transfer and bounce paths? | low-impact parser failure |
| Y4 | vault_withdraw_permissionless_state_transition | Does permissionless `withdraw_fee` race or replay deposit state around `CARRY_ALL_BALANCE | DESTROY_IF_ZERO` and router vault derivation? | trusted-on-trusted if only fee liveness |
| Y5 | router_upgrade_parallel_finalize_cancel | Can parallel code/admin/pool-code upgrade timers or cancellation order install mismatched code/state or bypass the intended delay? | admin-user-harm / trusted-on-trusted |

Auto-pick: Y1, because it is the only post-exhaustion cell with a plausible
cross-contract asset-selection failure that can be tested against both pool
construction and vault state-init derivation without assuming privileged
behavior.
