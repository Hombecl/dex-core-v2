# Post-matrix cluster proposals 9

These clusters pivot from the completed V-series into fee arithmetic, zero-output selection, bounce identity, overflow boundaries, and address normalization. Only one cell is executed per iteration.

| Cluster | Name | Class | Hypothesis | Priority | Disposition |
|---|---|---|---|---:|---|
| W1 | pool_referral_fee_rounding_dust | arithmetic_rounding | Swap output and referral-fee floor/rounding can debit reserve value without assigning the corresponding fee or output, creating accumulated dust or a caller-visible reserve mismatch. | 1 | Iter 91 DEADEND_WITH_PROOF |
| W2 | router_pay_to_zero_amount_side_selection | branch_selection | A zero-output side or dual-zero payout can make `pay_to` select the wrong token address and forward zero or residual value to a destination inconsistent with the pool result. | 2 | Iter 92 DEADEND_WITH_PROOF |
| W3 | lp_account_bounce_query_id_alias | bounce_accounting | LP-account callback refunds and bounced messages may restore the wrong leg or query identity after a partial two-leg operation. | 3 | Iter 93 DEADEND_WITH_PROOF |
| W4 | vault_referral_fee_coin_limit_boundary | arithmetic_overflow | Repeated router deposits near the coin-width boundary can overflow `deposited_amount` or break the withdrawal invariant. | 4 | Iter 94 DEADEND_WITH_PROOF |
| W5 | address_none_standard_normalization | address_binding | `addr_none` and standard address forms across referral, response, and owner fields can create a state identity or payout destination mismatch. | 5 | Iter 95 DEADEND_WITH_PROOF |
