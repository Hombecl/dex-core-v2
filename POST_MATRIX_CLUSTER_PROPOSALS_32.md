# Post-matrix cluster proposals — Iter 203+

| Cell | Production mechanism P | Failure class C | Hypothesis | EV | Selection |
|---|---|---|---|---:|---|
| AU1 | pool_getter_provide_wallet_include_address_alias | read_only_identity | The `include_address` bit in the Pool wallet-discovery getter may shift the returned wallet or embedded owner address and bind a later transfer to another LP wallet. | 4 | pending |
| AU2 | pool_protocolfee_zero_payload_ref_split | fee_release / async_message_ordering | Dual protocol-fee pay_to messages with independently optional payload refs may clear both counters after only one usable leg, duplicating or stranding the second fee. | 1 | auto-picked |
| AU3 | pool_protocolfee_recipient_tuple_binding | sender_binding / fee_release | The protocol fee recipient is carried as owner/excess/original caller in both pay_to messages; a tuple mismatch could route one fee leg to a caller-controlled address. | 2 | pending |
| AU4 | router_getter_pair_workchain_addr_none | read_only_boundary | A getter pair with valid workchains but unusual address forms may derive a Pool StateInit distinct from route-time token wallet addresses. | 3 | pending |
| AU5 | pool_getter_fee_counter_visibility | read_only_state | Getter output may expose stale fee counters across a collect-fees clear/save boundary and induce an off-chain repeat collection. | 5 | pending |

Selection rationale: AU2 directly touches protocol-fee balances and has a two-message asynchronous release boundary, so it is the next cell.
