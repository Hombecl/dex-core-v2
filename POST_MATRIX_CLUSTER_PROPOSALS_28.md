# Post-matrix cluster proposals — Iter183+

AP1–AP5 are exhausted with verified dead ends. AG5 remains pending but its
carry/reserve family is covered by Iter99/X4, so this set pivots to a distinct
LP-provide math-exception commit boundary.

| Cell | New production mechanism | Failure class | Hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AQ1 | pool_lp_provide_math_exception_zero_mint_commit | accounting_conservation | A caught LP-provide math exception combined with `min_lp_out = 0` could commit input reserves and protocol counters while minting zero LP, allowing an attacker to distort the pool’s price or extract value from existing LPs. | 1 | auto-picked |
| AQ2 | pool_lp_provide_fee_counter_exception_split | fee_accounting | A variant-specific LP-provide exception could leave token fee counters and reserve additions out of sync when one fee leg is zero and the callback still saves. | 2 | pending |
| AQ3 | pool_lp_mint_zero_forward_payload_commit | async_message_ordering | A zero-LP mint with forward payload or insufficient forward gas could save Pool state before the LP-wallet message completes, leaving a reserve/supply mismatch. | 3 | pending |
| AQ4 | router_provide_both_positive_exception_flag | branch_selection | A caller-controlled `both_positive` flag combined with a zero minimum could route a single-sided or exception path into a two-sided LP-account state transition. | 4 | pending |
| AQ5 | pool_lp_provide_max_input_exception | arithmetic_boundary | Max-width LP-provide inputs could throw after partial fee/reserve mutation and still reach a successful save branch under a zero minimum. | 5 | pending |

## Selection rationale

AQ1 has the highest expected value because it tests whether a caught math
failure can turn an LP provide into a committed zero-share donation that
changes the price available to existing LPs. The pass will model all selected
Pool variants and run the live provide path with zero minimum output.
