# Post-matrix cluster proposals 19

AF1–AF5 are closed. These five new clusters pivot to seams not previously named in the matrix or the prior shadow cells.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AG1 | opcode_collision_dispatch | Can masked FunC CRC32 opcode values collide across selected dispatchers and route an attacker-shaped value-bearing body into the wrong handler? | Only the intentional shared `internal_transfer` jetton interface opcode; no unintended collision or no asset delta. |
| AG2 | lp_wallet_owner_master_state_identity | Can an LP-wallet owner/master/code tuple be accepted in one selected component but interpreted as another wallet’s owner, allowing LP balance or burn output substitution? | Deterministic state-init address and stored-owner/master checks match across all send/receive/burn paths. |
| AG3 | callback_operation_typing_alias | Can a callback body with a valid sender and an operation-shaped payload cross the pool/router/LP-account boundary with the wrong semantic operation or amount leg? | All in-scope producers emit exclusive one-leg amounts and consumers reject a non-derived sender. |
| AG4 | vault_destroy_redeploy_tuple_reuse | Can a destroyed/redeployed referral vault reuse a stale stored amount or owner/token tuple across an interleaved deposit and withdrawal? | Withdrawal clears the stored counter, and every new deposit is router-authenticated to one deterministic tuple. |
| AG5 | carry_reserve_failure_value_split | Can a selected `CARRY_*`/reserve path cause a token send, refund, or callback to commit while only the TON reserve decision fails? | Only TON balance changes; token balances, pool reserves, LP supply, and vault accounting remain conserved. |

Auto-pick: **AG1**. It is the only fresh cluster with a finite, mechanically complete proof obligation that can be closed before deeper economic modeling: enumerate all declared opcodes, mask exactly as the contracts do, exclude the deliberate interface alias, then exercise the selected dispatch callers.
