# Post-matrix cluster proposals 20

AG2 and AG4 are pre-killed by existing verified cells U4/R8/AB4 and U3/Y4/AB5/AC5. The next expansion moves to pool-family storage and state-init layout, which directly feeds reserve and LP accounting.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AH1 | pool_storage_variant_ref_arity | Do all five pool-family state-init and storage loaders/savers preserve the same reserve, LP supply, fee, and variant-parameter field order, or can one family interpret a value-bearing field under another meaning? | Exact round-trip field order plus family integration tests; no state mutation or balance delta. |
| AH2 | router_storage_upgrade_ref_arity | Can router storage load/save around temporary code/admin/pool upgrades drop or alias one code reference, changing a later value-bearing pool derivation? | Upgrade refs round-trip and admin-only gate remains intact. |
| AH3 | pool_dispatch_sender_precedence | Can an address-role overlap make Pool process a router/protocol/LP-wallet message through the wrong sender-priority branch? | Only trusted configuration collision or no token/reserve delta. |
| AH4 | lp_account_storage_coin_arity | Can LP-account storage load/save encode one of the two accumulated liquidity amounts under a different field after destroy/redeploy? | Exact two-coin round trip and lifecycle tests preserve per-user amounts. |
| AH5 | interface_payload_ref_arity | Can a producer’s optional payload/reference slot be consumed as a different field by a selected downstream interface? | Strict producer/consumer slot map and malformed-tail rejection preserve the amount/destination fields. |

Auto-pick: **AH1**. It is the highest-EV unresolved accounting seam and has a finite cross-family invariant that can be tested without reusing the closed vault, wallet-identity, or callback-typing cells.
