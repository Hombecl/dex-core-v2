# Post-matrix expansion — AJ clusters

Generated after AI1–AI5 closure. These clusters target unisolated invariant/math mechanisms and avoid the closed payload, storage, StateInit, dispatch, and setter cells.

| Cell | Production mechanism P | Failure class C | New hypothesis | Priority | Dispatch decision |
|---|---|---|---|---:|---|
| AJ1 | weighted_stableswap_solver | convergence_guard | Weighted-stableswap `solve_dx`/`solve_dy` derivative-zero, epsilon, and 255-iteration guards may accept an under-converged output or leave a reserve delta on a catch path. | 1 | AUTO-PICK |
| AJ2 | stableswap_invariant_solver | denominator_boundary | Stableswap invariant and output solvers may divide by a zero/near-zero denominator at extreme amplification/reserve ratios and release an unbacked output. | 2 | pending |
| AJ3 | weighted_const_product_ratio_guard | max_ratio_boundary | The weighted-constant-product 0.3 input-ratio limit may be applied to one direction but not its complement, allowing a reserve/invariant mismatch. | 3 | pending |
| AJ4 | constant_product_invariant_iteration | precision_rounding | Constant-product Newton iteration and normalized invariant rounding may mint or fee-credit a residual not backed by reserves. | 4 | pending |
| AJ5 | cross_variant_math_signature | interface_consistency | Variant `get_swap_out`/LP-provide/burn signatures may receive a different side/fee/invariant argument order under generated family selection. | 5 | pending |

Auto-dispatched: AJ1, highest expected evidence value because the convergence/derivative guard is a distinct arithmetic execution mechanism with a bounded loop and direct swap output impact.
