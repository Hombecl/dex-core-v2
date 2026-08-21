# Post-matrix cluster proposals 10

These clusters pivot into LP-wallet bounce accounting, protocol-fee counters, admin address transitions, callback gas carry, and getter payload boundaries. Only one cell is executed per iteration.

| Cluster | Name | Class | Hypothesis | Priority | Disposition |
|---|---|---|---|---:|---|
| X1 | lp_wallet_bounce_balance_restoration | bounce_accounting | A bounced LP-wallet internal transfer or burn notification can restore a balance using attacker-shaped body fields or the wrong operation, creating synthetic LP tokens or a stuck debit. | 1 | Iter 96 DEADEND_WITH_PROOF |
| X2 | pool_protocol_fee_counter_reserve_conservation | accounting_conservation | Protocol-fee counters and reserves can diverge across swaps, LP provision, fee collection, or failed callbacks, enabling a second collection or reserve underflow. | 2 | Iter 97 DEADEND_WITH_PROOF |
| X3 | admin_fee_address_none_transition | privileged_state | An admin fee-recipient transition to/from `addr_none` can leave protocol fees claimable by an old or unintended recipient. | 3 | Iter 98 DEADEND_WITH_PROOF; trusted-role filter applies |
| X4 | callback_carry_remaining_gas_reentry | gas_accounting | Callback messages using `CARRY_REMAINING_GAS` or `CARRY_ALL_BALANCE` can make a second leg execute with an attacker-controlled residual balance or alter state after a first-leg failure. | 4 | Iter 99 DEADEND_WITH_PROOF |
| X5 | getter_payload_ref_shape_boundary | payload_aliasing | Getter response cells with optional refs or address forms can make a read-only response encode a state-bearing field for another consumer. | 5 | Iter 100 DEADEND_WITH_PROOF |
