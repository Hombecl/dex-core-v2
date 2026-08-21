# Post-matrix cluster proposals — Iter168+

AM1–AM5 are exhausted with verified dead ends. These fresh clusters focus on the two user identities carried through LP-account callbacks and LP-wallet transfer notifications.

| Cell | New production mechanism | Failure class | Hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AN1 | lp_callback_user_to_user_identity | cross_contract_identity | Pool callback user_address authenticates the LP-account sender while to_user_address selects the LP-wallet owner; a mismatch or parser shift could mint LP against one user’s deposit to another identity with an unintended excess/notification route. | 1 | auto-picked |
| AN2 | lp_wallet_mint_from_address_notification | notification_identity | The mint body’s from_address is user-controlled through the callback and is forwarded to transfer_notification; a mismatch between from_address and wallet owner could cause downstream routing to treat minted LP as another source. | 2 | pending |
| AN3 | lp_callback_refund_excess_identity_split | error_refund | On Pool rejection, refund_address and excess_address are carried separately from user_address; a tuple-shape or state-init mismatch could return token legs to a different account while preserving the original LP-account state. | 3 | pending |
| AN4 | lp_wallet_response_address_workchain | destination_binding | LP-wallet excess routing checks only address form bits at receive time; a noncanonical response/excess address could redirect residual TON or alter bounce behavior after LP credit. | 4 | pending |
| AN5 | lp_account_callback_replay_query_identity | replay_correlation | Replaying a valid callback body with a different query_id or user/to_user tuple could re-use an LP-account state transition or duplicate LP mint across asynchronous messages. | 5 | pending |

## Selection rationale

AN1 has the highest expected value because it directly joins the authenticated LP-account owner, the Pool callback fields, the derived LP-wallet StateInit, and downstream user-facing delivery. It will be checked with tuple permutations, sender derivation, and live alternate-recipient flows.

