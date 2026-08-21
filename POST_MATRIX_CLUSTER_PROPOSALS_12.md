# Post-matrix cluster proposals 12

The Y cluster is exhausted without a surviving candidate. These five new cells
spiral into distinct LP-account and payout boundaries while retaining the
selected five-entry-contract scope and all evidence gates.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| Z1 | lp_account_burn_state_clear_before_payout | Does a user-triggered LP burn clear one or both stored LP-account legs before downstream LP-wallet payouts, allowing a bounce or partial leg to strand or duplicate reserves? | none until caller and bounce proof |
| Z2 | lp_account_refund_excess_carry_destination | Can refund/excess addresses supplied to LP-account user messages redirect carried TON or couple the excess leg to a token payout after partial liquidity? | low-impact TON-only |
| Z3 | pool_lp_account_callback_leg_identity | Can a pool callback carrying two LP-account output legs swap token0/token1 or user/excess identities after one leg has committed? | single-by-design if static ordering |
| Z4 | router_getter_upgrade_code_visibility | Can read-only router getter code/state fields become stale across a pending/finalized pool-code upgrade and feed a state-init caller into a different asset path? | read-only/no asset delta |
| Z5 | lp_wallet_response_excess_workchain_boundary | Can an LP-wallet response/excess address with a nonstandard workchain or `addr_none` alter balance restoration or cause a payout to an unintended wallet? | parser/gas-only |

Auto-pick: Z1, because it combines an external user entry point, two scoped
asset payout legs, bounce/state persistence, and a concrete reserve-delta test
without relying on admin or trusted-role behavior.
