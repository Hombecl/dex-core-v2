# Post-matrix cluster proposals 16

The AC lifecycle and payload cells are closed. These new clusters pivot to
user-controlled liquidity flags, parser failure/refund typing, nested route
payload boundaries, vault coin serialization, and LP-account destroy ordering.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AD1 | lp_account_both_positive_flag_mint_gate | Can a caller-controlled `both_positive` bit cross router → pool → LP-account boundaries and cause liquidity minting or reserve updates that do not match the two supplied token legs? | user can only suppress mint if the flag is inconsistent; prove no unbacked mint |
| AD2 | pool_provide_lp_parser_error_refund_typing | Can truncated or malformed provide-LP payloads make the pool’s parser catch choose a wrong error/refund tuple while the input jettons remain committed? | parser-only if catch refunds the full original legs |
| AD3 | router_nested_route_payload_tail_boundary | Can trailing or nested route payload cells change the selected pool/token wallet or caller across a cross-swap recursion while preserving the router sender check? | payload-only if route state-init and sender binding remain invariant |
| AD4 | vault_deposited_amount_coin_serialization_limit | Can repeated router deposits cross the coin-width serialization boundary and leave a vault permanently unable to withdraw or redirect a stored fee? | unreachable-width arithmetic if no practical attacker-controlled path |
| AD5 | lp_account_mint_destroy_save_order | Can LP-account minting with `DESTROY_IF_ZERO` and a subsequent storage save resurrect stale amounts or duplicate a callback after pool rejection? | duplicate state only if callback/redeploy path remains amount-bound |

Auto-pick: AD1, because the bit is supplied in the user payload, is consumed
across router/pool/LP-account layers, and directly controls whether real LP
tokens are minted against the account’s accumulated token legs.
