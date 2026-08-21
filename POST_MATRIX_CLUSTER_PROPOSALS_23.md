# Post-matrix cluster proposals — Iter 158+

AJ1–AJ5 exhausted the prior solver/signature surface. These clusters are new checks focused on intermediate arithmetic width, serialization width, and invariant preservation across the selected Pool-family implementations.

| Cell | New production mechanism | Failure class | Hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AK1 | cross_variant_math_intermediate_bitwidth | arithmetic_overflow | Fixed-point products, reserve products, exponent intermediates, and fee multiplications may exceed the TVM signed-integer width at max 120-bit coin inputs before output or reserve checks, creating a wrapped or malformed value-bearing result. | 1 | auto-picked |
| AK2 | pool_fee_aggregate_floor_ceiling | arithmetic_rounding | Sequential protocol/referral ceil fees combined with LP-fee floor rounding may subtract more than the computed output on a successful branch after a variant-specific base-output round. | 2 | pending |
| AK3 | lp_supply_coin_serialization_boundary | coin_width | LP supply deltas and reserve-derived mint/burn amounts may cross the 120-bit coin serialization boundary in a successful LP callback before the max-supply guard. | 3 | pending |
| AK4 | variant_setter_deserialization_width | serialization_alias | Amp, weight, and rate setter fields may deserialize at a width different from the corresponding pool storage field, truncating a value or activating a different math domain. | 4 | pending |
| AK5 | invariant_preservation_after_fee_state | accounting_conservation | Variant-specific LP-provide fee deductions may reduce the post-fee invariant while still minting LP supply or recording protocol fees. | 5 | pending |

Iter 158 executes AK1 only.
