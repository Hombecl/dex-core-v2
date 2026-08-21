# Post-matrix cluster proposals 14

The AA cluster is exhausted; AA4 was explicitly killed as trusted-on-trusted.
These five new cells spiral into arithmetic and conservation boundaries that can
be reached by external swap/liquidity users.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AB1 | pool_max_coins_invariant_boundary | Can reserve/LP supply values at the maximum coin width make `muldiv` output, fee subtraction, or post-operation checks wrap and release unbacked tokens? | none until arithmetic proof |
| AB2 | pool_lp_supply_minimum_lock_boundary | Can the required locked LP minimum make a near-empty pool burn or provide path pass with zero/negative effective supply and misaccount reserves? | none until concrete delta |
| AB3 | router_cross_router_original_caller_binding | Across two routers, can the mid-hop `original_caller` and refund/excess fields diverge so the second router pays a different account? | none until cross-router trace |
| AB4 | lp_wallet_master_credit_debit_conservation | Can an LP-wallet internal transfer accepted from the master or a user wallet credit without a matching source debit under a state-init or bounce ordering? | none until source/target trace |
| AB5 | vault_deposit_extra_payload_state_boundary | Can extra body fields or excess-recipient forms in router-authenticated vault deposits change stored fee amount or redeploy a different owner/token vault? | parser-only if no asset delta |

Auto-pick: AB1, because it is externally reachable, spans pool math and router
payout layers, and can be falsified with direct max-width invariant tests rather
than privileged assumptions.
