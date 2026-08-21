# Post-matrix cluster proposals 8

These five clusters extend the value-flow and message-boundary review after U5. Only one cell is executed per iteration.

| Cluster | Name | Class | Hypothesis | Priority | Disposition |
|---|---|---|---|---:|---|
| V1 | router_cross_swap_gas_threshold_residual | gas_accounting | The router `pay_to` cross-swap branch uses a strict residual-gas threshold and subtracts `used_gas` before re-routing; a boundary value could underfund or duplicate the nested swap/refund while preserving a caller-controlled asset amount. | 1 | Iter 86 DEADEND_WITH_PROOF |
| V2 | lp_wallet_notification_payload_alias | payload_aliasing | LP-wallet `receive_tokens` forwards the unconsumed body slice as a notification payload while separately returning excess TON; a malformed remainder or address form could redirect a notification or couple it to the wrong owner. | 2 | Iter 87 DEADEND_WITH_PROOF |
| V3 | vault_withdraw_carry_destroy_balance | value_conservation | Public vault withdrawal uses `CARRY_ALL_BALANCE | DESTROY_IF_ZERO` and clears state after sending to the router; a balance/storage boundary could destroy or strand deposited fee value. | 3 | Iter 88 DEADEND_WITH_PROOF |
| V4 | router_route_error_refund_encoding | error_refund | `route_dex_messages` catches parser/validation errors and encodes the error into a jetton transfer to the caller; a malformed payload could alter refund or excess destinations across the nested route. | 4 | Iter 89 DEADEND_WITH_PROOF |
| V5 | pool_pay_to_custom_payload_dispatch | payload_aliasing | Router `pay_to` infers cross-swap dispatch from the first 32 bits of a custom payload and otherwise transfers tokens; a payload-shape boundary could select a nested route or lose a normal payout. | 5 | Iter 90 DEADEND_WITH_PROOF |
