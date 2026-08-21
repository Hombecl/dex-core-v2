# Post-matrix cluster proposals 18

The AE cells are closed without an external H/C candidate. This expansion
returns to the remaining message-header and administrative boundaries, with
the first cell limited to the LP-wallet bounced-body restoration path.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AF1 | lp_wallet_bounced_header_spoof_restore | Can an externally deliverable bounced header/body with an allowed opcode and attacker-sized amount make LP-wallet `on_bounce` restore a balance without a matching outbound debit? | protocol-only bounced bit or exact prior outbound message binding if no forgeable inbound path exists |
| AF2 | pool_burn_payload_wrapper_leg_split | Can the burn custom-payload two-bit wrapper split payloads across the two output legs while amount/token/reserve accounting remains committed, causing one leg to be rerouted or lost? | notification-only if both output amounts and router sender remain fixed |
| AF3 | router_admin_reset_pool_gas_recipient | Can the admin reset-pool-gas path redirect carried TON or affect a pool’s state while bypassing the router/pool identity boundary? | admin-only TON routing; kill if no user asset delta |
| AF4 | pool_reset_gas_body_tail_parse | Can a reset-gas body with trailing or malformed address bits select an unintended excess recipient or mutate pool state? | TON-only parser behavior with no token/reserve mutation |
| AF5 | lp_account_getter_response_state_alias | Can an LP-account getter response or included address reference expose or alias state-bearing data for a different account/pool consumer? | read-only output with no downstream state transition |

Auto-pick: AF1. It has the highest expected value because `on_bounce` adds a
body-supplied amount directly to a live LP-wallet balance and the handler’s
allowlist is opcode-based; the key question is whether the bounced-header bit
and body are forgeable by an external sender or protocol-generated only.
