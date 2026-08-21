# Post-matrix AX cluster proposals

All AW cells are closed. Fresh AX cells are selected from unclosed implementation boundaries; AX1 is auto-picked as the highest-EV next drill.

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority |
|---|---|---|---|---:|
| AX1 | router_admin_temp_upgrade_tuple_rebinding | upgrade_state_machine / partial_finalize | `pack_temp_upgrade` and `unpack_temp_upgrade` carry Router-code, admin, and pool-code deadlines through one cell; a partial finalize/cancel sequence could rebind one pending field to another or leave a stale replacement code active. | 1 |
| AX2 | pool_internal_set_fees_tail_excess_address | admin_payload / parser_boundary | The Router-to-Pool internal fee-update body loads fee fields and an excess address without a terminal parse; a tail or optional address form could persist a fee recipient or strand carry value. | 2 |
| AX3 | router_route_dex_available_gas_exact_boundary | gas_budget / carry_mode | The Router route check uses a strict available-gas threshold before building a StateInit-backed Pool call; an exact-boundary payload may enter with insufficient downstream value and create a refund or accounting asymmetry. | 3 |
| AX4 | lp_account_direct_add_post_send_commit_order | async_commit / residual_liquidity | Direct-add sends a Pool callback before saving the LP-account remainder; a downstream callback bounce or partial leg could leave stale liquidity available for a second direct-add. | 4 |
| AX5 | pool_swap_refund_error_payload_amount_binding | error_encoding / refund_route | Swap failure branches encode error metadata beside fixed amount/token refund legs; a malformed error code or custom payload boundary could alter the refund amount or recipient selected downstream. | 5 |
