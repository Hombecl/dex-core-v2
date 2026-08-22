# CHAIN HYPOTHESIS TABLE — Iter 1 seed

Scope is limited to the five selected entrypoint assets recorded in `R1-SURFACE-RANKING.md`. Included implementation files are trace-only support. Each row is one cell; execution order is row order unless a falsification result pivots the next cell.

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| P1xC1 | swap | sender_binding | A swap path accepts a forged sender or callback identity. | 2 | deadend_with_proof |
| P1xC2 | swap | amount_conservation | Swap settlement can debit one side without matching reserve/recipient accounting. | 1 | deadend_with_proof |
| P1xC3 | swap | state_persistence | A swap checkpoint is stored under weaker proof and consumed later as settled. | 3 | deadend_with_proof |
| P1xC4 | swap | bounce_reversal | A bounced swap leg fails to restore the exact amount or state. | 4 | deadend_with_proof |
| P1xC5 | swap | message_ordering_fees | Forwarded payload or fee arithmetic changes the effective swap amount. | 5 | deadend_with_proof |
| P2xC1 | provide_lp | sender_binding | LP provisioning trusts a caller-controlled account or wallet identity. | 7 | deadend_with_proof |
| P2xC2 | provide_lp | amount_conservation | LP minting or pool credit does not match tokens actually received. | 6 | deadend_with_proof |
| P2xC3 | provide_lp | state_persistence | A pending deposit is replayable or consumed twice. | 8 | deadend_with_proof |
| P2xC4 | provide_lp | bounce_reversal | A failed deposit leaves LP credit or reserve credit behind. | 9 | deadend_with_proof |
| P2xC5 | provide_lp | message_ordering_fees | Deposit forwarding can strand value or bypass the intended minimum. | 10 | deadend_with_proof |
| P3xC1 | withdraw_lp | sender_binding | Withdrawal responds to an unbound LP account or wallet. | 12 | deadend_with_proof |
| P3xC2 | withdraw_lp | amount_conservation | Burned LP units yield more reserves than the account's entitlement. | 11 | deadend_with_proof |
| P3xC3 | withdraw_lp | state_persistence | A withdrawal state can be reused after a prior settlement. | 13 | deadend_with_proof |
| P3xC4 | withdraw_lp | bounce_reversal | A bounced withdrawal restores LP state but not reserve state, or vice versa. | 14 | deadend_with_proof |
| P3xC5 | withdraw_lp | message_ordering_fees | Withdrawal fee/forwarding ordering creates a value leak. | 15 | deadend_with_proof |
| P4xC1 | lp_wallet_transfer | sender_binding | LP wallet transfer authorization can be bypassed through message parsing. | 17 | deadend_with_proof |
| P4xC2 | lp_wallet_transfer | amount_conservation | Wallet balance decreases without an equal downstream credit. | 16 | deadend_with_proof |
| P4xC3 | lp_wallet_transfer | state_persistence | Transfer state or query identity permits replay. | 18 | deadend_with_proof |
| P4xC4 | lp_wallet_transfer | bounce_reversal | Bounced transfer restores a stale or wrong balance. | 19 | deadend_with_proof |
| P4xC5 | lp_wallet_transfer | message_ordering_fees | Forward amount and fee checks allow underfunded or misdirected transfer. | 20 | deadend_with_proof |
| P5xC1 | lp_wallet_receive | sender_binding | `internal_transfer` accepts an unauthorized sender or derived wallet. | 22 | deadend_with_proof |
| P5xC2 | lp_wallet_receive | amount_conservation | Wallet balance credits tokens not delivered by the accepted sender. | 21 | deadend_with_proof |
| P5xC3 | lp_wallet_receive | state_persistence | Replayed notification or callback double-credits wallet balance. | 23 | deadend_with_proof |
| P5xC4 | lp_wallet_receive | bounce_reversal | Receive-side bounce handling over-credits or fails to restore funds. | 24 | deadend_with_proof |
| P5xC5 | lp_wallet_receive | message_ordering_fees | Forwarded notification and excesses alter the recipient's economic delta. | 25 | deadend_with_proof |
| P6xC1 | lp_wallet_burn | sender_binding | Burn authority or response routing can be redirected. | 27 | deadend_with_proof |
| P6xC2 | lp_wallet_burn | amount_conservation | Burn reduces wallet balance without matching master-side burn semantics. | 26 | deadend_with_proof |
| P6xC3 | lp_wallet_burn | state_persistence | Burn notification can be duplicated or detached from its query. | 28 | deadend_with_proof |
| P6xC4 | lp_wallet_burn | bounce_reversal | Burn bounce restores the wrong amount or state. | 29 | deadend_with_proof |
| P6xC5 | lp_wallet_burn | message_ordering_fees | Burn gas/fee ordering causes unintended reserve or balance loss. | 30 | deadend_with_proof |
| P7xC1 | bounce | sender_binding | Bounce is accepted without binding to the original outbound leg. | 32 | deadend_with_proof |
| P7xC2 | bounce | amount_conservation | Bounce restoration can be inflated or omitted. | 31 | deadend_with_proof |
| P7xC3 | bounce | state_persistence | A bounce can be replayed after state has advanced. | 33 | deadend_with_proof |
| P7xC4 | bounce | bounce_reversal | Distinct operation types share an unsafe reversal path. | 34 | deadend_with_proof |
| P7xC5 | bounce | message_ordering_fees | Bounce timing changes whether a balance is restored before spend. | 35 | deadend_with_proof |
| P8xC1 | referral_fee_deposit | sender_binding | Vault accepts deposits from a non-router sender. | 37 | deadend_with_proof |
| P8xC2 | referral_fee_deposit | amount_conservation | Vault deposited amount diverges from router-sent fee amount. | 36 | deadend_with_proof |
| P8xC3 | referral_fee_deposit | state_persistence | Repeated fee messages create duplicated vault credit. | 38 | deadend_with_proof |
| P8xC4 | referral_fee_deposit | bounce_reversal | Failed fee transfer leaves vault accounting credited. | 39 | deadend_with_proof |
| P8xC5 | referral_fee_deposit | message_ordering_fees | Fee withdrawal and storage/gas accounting leak value. | 40 | deadend_with_proof |
| P9xC1 | getter_quote | sender_binding | Getter-derived addresses or quotes expose another account's state. | 42 | deadend_with_proof |
| P9xC2 | getter_quote | amount_conservation | Quote math diverges from settlement math enough to enable extraction. | 41 | deadend_with_proof |
| P9xC3 | getter_quote | state_persistence | Getter reads stale state relied on by an executable path. | 43 | deadend_with_proof |
| P9xC4 | getter_quote | bounce_reversal | Read-only derivation disagrees with bounce recovery state. | 44 | deadend_with_proof |
| P9xC5 | getter_quote | message_ordering_fees | Quote path omits a fee or forwarded value used in settlement. | 45 | deadend_with_proof |
| P10xC1 | governance_rate | sender_binding | Governance or rate setter accepts an unbound caller. | 47 | deadend_with_proof |
| P10xC2 | governance_rate | amount_conservation | Parameter change breaks reserve or output conservation. | 46 | deadend_with_proof |
| P10xC3 | governance_rate | state_persistence | A stale authorized state can be replayed to alter parameters. | 48 | deadend_with_proof |
| P10xC4 | governance_rate | bounce_reversal | Governance message failure leaves an unsafe partial update. | 49 | deadend_with_proof |
| P10xC5 | governance_rate | message_ordering_fees | Ordering or fee conditions let a setter change live economics unexpectedly. | 50 | deadend_with_proof |
| Q1 | notification_identity_owner_binding | sender_binding | A forged transfer notification can use a body-supplied owner to route value through an existing pool. | 51 | deadend_with_proof |
| Q2 | state_init_identity_collision | state_persistence | A token-order or code-cell derivation collision maps one component's message to another component's state. | 52 | deadend_with_proof |
| Q3 | callback_payload_aliasing | sender_binding | A valid pool callback can alias nested amount/recipient/refund fields across operations. | 53 | deadend_with_proof |
| Q4 | rate_transition_boundary | state_persistence | Edge rate/weight/amp transitions bypass validation or alter live pricing outside the trusted setter path. | 54 | deadend_with_proof |
| Q5 | ton_reserve_carry_value_flow | amount_conservation | Repeated carry/refund/getter paths bypass TON reserve floors or leak contract balance. | 55 | deadend_with_proof |
| R3 | refund_account_substitution | state_persistence | A failed LP add creates a refund LP account under the wrong owner or lets an attacker claim it. | 56 | deadend_with_proof |
| R1 | protocol_fee_callback | sender_binding | A forged or replayed protocol-fee callback can drain collected fees or clear fee accounting for an unauthorized recipient. | 57 | deadend_with_proof |
| R2 | lp_burn_notification | amount_conservation | A forged LP burn notification or bounce path releases tokens without a matching LP supply/reserve reduction. | 58 | deadend_with_proof |
| R4 | code_upgrade_rollback | state_persistence | Upgrade, cancellation, or finalization ordering can install attacker code or roll back authorization/state without the admin path. | 59 | deadend_with_proof |
| R5 | unknown_op_bounce_typing | bounce_reversal | Unknown-opcode or bounce typing lets malformed messages mutate selected state or inflate a wallet balance. | 60 | deadend_with_proof |
| R6 | vault_withdraw_bounce_replay | bounce_reversal | A public vault withdrawal clears accounting before downstream delivery, allowing a bounce/replay to lose or duplicate referral-fee value. | 61 | deadend_with_proof |
| R7 | vault_state_init_owner_token_collision | state_persistence | Owner/token/router ordering or state-init reuse maps a referral vault deposit or withdrawal to another vault’s stored owner. | 62 | deadend_with_proof |
| R8 | lp_wallet_receive_master_alias | sender_binding | LP-wallet internal_transfer sender alternatives let a forged balance credit bypass the owner/master boundary. | 63 | deadend_with_proof |
| R9 | router_pay_to_zero_leg | amount_conservation | A pay_to message with both output legs zero or malformed token addresses can consume router state without a matching pool debit, or alias one leg into the other. | 64 | deadend_with_proof |
| R10 | pool_router_message_replay | message_ordering_fees | Replaying a valid router callback or reusing a query id can apply a swap/provide/burn state transition twice. | 65 | deadend_with_proof |
| R11 | swap_catch_state_rollback | state_persistence | Swap reserve/fee mutations made before a caught validation failure remain persisted or interact with the refund action, creating reserve drift. | 66 | deadend_with_proof |
| R12 | provide_catch_state_rollback | bounce_reversal | Liquidity-provision state changes before deadline/min-liquidity failure survive the catch branch while input tokens are refunded. | 67 | deadend_with_proof |
| R13 | route_token_wallet_binding | token_wallet_route | A crafted token-wallet notification can select a different pool/token route while satisfying only message-body fields. | 68 | deadend_with_proof |
| R14 | referral_fee_arithmetic_overflow | arithmetic_overflow | Referral/protocol fee multiplication or subtraction wraps at a boundary and leaks pool output or miscredits a vault. | 69 | deadend_with_proof |
| R15 | upgraded_pool_address_binding | upgrade_state | A pool-code upgrade or re-derived state-init address disconnects sender binding, allowing callbacks or funds to be accepted from an old/new pool address. | 70 | deadend_with_proof |
| S1 | direct_add_liquidity_identity_clearance | sender_binding | Direct user-triggered LP-account additions can use stale accumulated amounts or mismatched refund/excess fields after the callback clears account state. | 71 | deadend_with_proof |
| S2 | direct_refund_me_bounce_replay | bounce_reversal | A user-triggered LP-account refund clears balances before a downstream router payment, and a bounce or repeated refund can duplicate or strand the refund. | 72 | deadend_with_proof |
| S3 | lp_wallet_forward_payload_balance | amount_conservation | LP-wallet receive-notification forwarding can alter balance or owner notification semantics when forward gas/payload fields are edge-sized or malformed. | 73 | deadend_with_proof |
| S4 | protocol_fee_dual_leg_clearance | message_ordering_fees | Two-sided protocol-fee collection or a zero leg can clear accounting before one downstream token payment, causing fee loss or double collection. | 74 | deadend_with_proof |
| S5 | getter_static_code_identity | state_persistence | Getter-derived pool/LP-wallet addresses diverge from runtime static identity after a pool code upgrade, exposing an address alias used by a stateful caller. | 75 | deadend_with_proof |
| T1 | cross_swap_nested_refund_binding | sender_binding | Nested cross-swap payloads can substitute the final receiver/refund/excess identity across router hops while retaining a valid pool-sender chain. | 76 | deadend_with_proof |
| T2 | burn_dual_output_bounce_accounting | bounce_reversal | LP-wallet burn with two downstream output legs can clear supply/balance state before one leg bounces, restoring or stranding an asymmetric amount. | 77 | deadend_with_proof |
| T3 | referral_vault_deposit_replay_identity | message_ordering_fees | Referral-vault deposits accept a repeated or mismatched token/owner tuple that credits the wrong vault or makes a deposit claimable twice. | 78 | deadend_with_proof |
| T4 | initial_liquidity_minimum_boundary | arithmetic_overflow | Initial-liquidity subtraction of required minimum supply can create an underflow/zero-mint state that bypasses reserve or LP supply checks. | 79 | deadend_with_proof |
| T5 | pay_to_dual_leg_cross_route | amount_conservation | A malformed `pay_to` with both output legs positive can select one token for a nested cross-swap while summing both amounts, creating a cross-route amount mismatch. | 80 | deadend_with_proof |
| U1 | pool_first_liquidity_sender_initialization | sender_binding | A first liquidity callback can initialize an uninitialized pool under a caller-controlled LP account or static tuple, bypassing the router/token identity boundary and capturing reserves or LP supply. | 81 | deadend_with_proof |
| U2 | async_getter_response_address_confusion | sender_binding | An asynchronous getter callback can route a state-bearing response to a body-supplied address or alias another component’s response path. | 82 | deadend_with_proof |
| U3 | vault_destroy_recreate_deposit_order | state_persistence | Vault destruction after withdrawal and immediate state-init recreation can reorder deposits or make a pending fee claim spendable twice. | 83 | deadend_with_proof |
| U4 | lp_wallet_codecell_sender_collision | state_persistence | LP-wallet code-cell or owner/master ordering can make two deterministic LP wallets share a state identity across pools or users after code updates. | 84 | deadend_with_proof |
| U5 | weighted_rate_setter_domain_boundary | arithmetic_overflow | A weighted-stableswap rate update at a domain boundary can create invalid invariant arithmetic or reserve extraction through the setter callback. | 85 | deadend_with_proof |
| V1 | router_cross_swap_gas_threshold_residual | gas_accounting | The router `pay_to` cross-swap branch uses a strict residual-gas threshold and subtracts `used_gas` before re-routing; a boundary value could underfund or duplicate the nested swap/refund while preserving a caller-controlled asset amount. | 86 | deadend_with_proof |
| V2 | lp_wallet_notification_payload_alias | payload_aliasing | LP-wallet `receive_tokens` forwards the unconsumed body slice as a notification payload while separately returning excess TON; a malformed remainder or address form could redirect a notification or couple it to the wrong owner. | 87 | deadend_with_proof |
| V3 | vault_withdraw_carry_destroy_balance | value_conservation | Public vault withdrawal uses `CARRY_ALL_BALANCE | DESTROY_IF_ZERO` and clears state after sending to the router; a balance/storage boundary could destroy or strand deposited fee value. | 88 | deadend_with_proof |
| V4 | router_route_error_refund_encoding | error_refund | `route_dex_messages` catches parser/validation errors and encodes the error into a jetton transfer to the caller; a malformed payload could alter refund or excess destinations across the nested route. | 89 | deadend_with_proof |
| V5 | pool_pay_to_custom_payload_dispatch | payload_aliasing | Router `pay_to` infers cross-swap dispatch from the first 32 bits of a custom payload and otherwise transfers tokens; a payload-shape boundary could select a nested route or lose a normal payout. | 90 | deadend_with_proof |
| W1 | pool_referral_fee_rounding_dust | arithmetic_rounding | Swap output and referral-fee floor/rounding can debit reserve value without assigning the corresponding fee or output, creating accumulated dust or a caller-visible reserve mismatch. | 91 | deadend_with_proof |
| W2 | router_pay_to_zero_amount_side_selection | branch_selection | A zero-output side or dual-zero payout can make `pay_to` select the wrong token address and forward zero or residual value to a destination inconsistent with the pool result. | 92 | deadend_with_proof |
| W3 | lp_account_bounce_query_id_alias | bounce_accounting | LP-account callback refunds and bounced messages may restore the wrong leg or query identity after a partial two-leg operation. | 93 | deadend_with_proof |
| W4 | vault_referral_fee_coin_limit_boundary | arithmetic_overflow | Repeated router deposits near the coin-width boundary can overflow `deposited_amount` or break the withdrawal invariant. | 94 | deadend_with_proof |
| W5 | address_none_standard_normalization | address_binding | `addr_none` and standard address forms across referral, response, and owner fields can create a state identity or payout destination mismatch. | 95 | deadend_with_proof |
| X1 | lp_wallet_bounce_balance_restoration | bounce_accounting | A bounced LP-wallet internal transfer or burn notification can restore a balance using attacker-shaped body fields or the wrong operation, creating synthetic LP tokens or a stuck debit. | 96 | deadend_with_proof |
| X2 | pool_protocol_fee_counter_reserve_conservation | accounting_conservation | Protocol-fee counters and reserves can diverge across swaps, LP provision, fee collection, or failed callbacks, enabling a second collection or reserve underflow. | 97 | deadend_with_proof |
| X3 | admin_fee_address_none_transition | privileged_state | An admin fee-recipient transition to/from `addr_none` can leave protocol fees claimable by an old or unintended recipient. | 98 | deadend_with_proof |
| X4 | callback_carry_remaining_gas_reentry | gas_accounting | Callback messages using `CARRY_REMAINING_GAS` or `CARRY_ALL_BALANCE` can make a second leg execute with an attacker-controlled residual balance or alter state after a first-leg failure. | 99 | deadend_with_proof |
| X5 | getter_payload_ref_shape_boundary | payload_aliasing | Getter response cells with optional refs or address forms can make a read-only response encode a state-bearing field for another consumer. | 100 | deadend_with_proof |
| Y1 | router_pay_vault_single_side_stateinit | state_init_asset_binding | `pay_vault` sums referral-fee legs and selects a token-derived vault; a two-sided/zero-sided tuple or caller/state-init mismatch could release real token value to an unintended referral address. | 101 | deadend_with_proof |
| Y2 | router_route_untrusted_notification_binding | sender_binding | An untrusted `transfer_notification` sender/from-address combination could cross the router's token-wallet, pool, or refund identity boundaries into real-asset movement. | 102 | deadend_with_proof |
| Y3 | lp_wallet_forward_payload_dict_boundary | payload_aliasing | The LP-wallet's ignored custom dictionary and forwarded remainder could alter transfer parsing, destination, balance, or bounce restoration. | 103 | deadend_with_proof |
| Y4 | vault_withdraw_permissionless_state_transition | state_persistence | Permissionless vault withdrawal and `CARRY_ALL_BALANCE | DESTROY_IF_ZERO` could replay, destroy, or strand a deposited referral fee across withdrawal/redeposit ordering. | 104 | deadend_with_proof |
| Y5 | router_upgrade_parallel_finalize_cancel | privileged_state | Parallel router code/admin/pool-code upgrade timers or cancellation order could overwrite unrelated state or bypass a delay. | 105 | deadend_with_proof (privileged kill) |
| Z1 | lp_account_burn_state_clear_before_payout | bounce_accounting | LP burn reserve/supply clearance before two payout legs could strand or duplicate assets after a bounce or partial leg. | 106 | deadend_with_proof |
| Z2 | lp_account_refund_excess_carry_destination | destination_binding | LP-account refund/excess addresses and carried TON could redirect token value or couple a partial-liquidity refund to another user's state. | 107 | deadend_with_proof |
| Z3 | pool_lp_account_callback_leg_identity | sender_binding | LP-account callbacks carrying two legs could swap token0/token1 or user/excess identities after one callback leg committed. | 108 | deadend_with_proof |
| Z4 | router_getter_upgrade_code_visibility | state_init_asset_binding | Pending/finalized pool-code getter fields could become stale and feed a different state-init address into a value-bearing caller. | 109 | deadend_with_proof |
| Z5 | lp_wallet_response_excess_workchain_boundary | destination_binding | LP-wallet response/excess addresses with nonstandard workchains or `addr_none` could alter balance restoration or route a payout to an unintended wallet. | 110 | deadend_with_proof |
| AA1 | pool_callback_failure_redeploy_refund_binding | state_init_asset_binding | Pool callback failure can redeploy an LP account with both input amounts; a mismatched refund/user identity could redirect or duplicate the stored refund. | 111 | deadend_with_proof |
| AA2 | lp_account_add_liquidity_storage_merge | state_persistence | Repeated pool `add_liquidity` callbacks could merge amounts across users or mint against another account's stored single-sided balance. | 112 | deadend_with_proof |
| AA3 | router_pay_to_excess_address_invalidation | destination_binding | Malformed or expired route returns could bypass validation and decouple `pay_to` residual TON/token recipients from the original caller. | 113 | deadend_with_proof |
| AA4 | pool_set_fees_protocol_recipient_boundary | privileged_state | Fee recipient/token updates could make protocol counters accrue to an unreachable or unintended route. | 115 | killed_trusted_on_trusted |
| AA5 | router_transfer_bounce_error_recipient | error_refund | Parser and validation catch branches could encode different bounce errors while selecting a refund/excess recipient that changes who receives returned tokens. | 114 | deadend_with_proof |
| AB1 | pool_max_coins_invariant_boundary | arithmetic_boundary | Maximum-width reserves or LP supply could make invariant/fee arithmetic release unbacked tokens before the post-operation bound check. | 116 | deadend_with_proof |
| AB2 | pool_lp_supply_minimum_lock_boundary | minimum_supply | The required locked LP minimum could make a near-empty pool burn or provide path pass with zero/negative effective supply and misaccount reserves. | 117 | deadend_with_proof |
| AB3 | router_cross_router_original_caller_binding | cross_router_identity | Across two routers, the mid-hop `original_caller` and refund/excess fields could diverge so the second router pays a different account. | 118 | deadend_with_proof |
| AB4 | lp_wallet_master_credit_debit_conservation | token_conservation | An LP-wallet internal transfer accepted from the master or a user wallet could credit without a matching source debit under state-init or bounce ordering. | 119 | deadend_with_proof |
| AB5 | vault_deposit_extra_payload_state_boundary | vault_binding | Extra body fields or excess-recipient forms in router-authenticated vault deposits could change stored fee amount or redeploy a different owner/token vault. | 120 | deadend_with_proof |
| AC1 | router_pool_pair_orientation_stateinit | pair_orientation | Reversing token-wallet order between router routing, pool state-init, and pay_to could make a valid pool send one asset under the other asset's wallet. | 121 | deadend_with_proof |
| AC2 | pool_swap_fee_rounding_zero_output | fee_rounding | Fee/referral ceil rounding at exact small outputs could subtract more than the computed output or bypass the positive-output/refund invariant. | 122 | deadend_with_proof |
| AC3 | lp_account_refund_then_direct_add_lifecycle | callback_lifecycle | A failed minimum-LP callback followed by direct add/refund ordering could reuse stale LP-account amounts or mint against cleared state. | 123 | deadend_with_proof |
| AC4 | lp_wallet_forward_payload_reference_depth | payload_reference | Nested forward-payload reference depth or trailing bits could alter owner notification while leaving LP debit committed. | 124 | deadend_with_proof |
| AC5 | vault_concurrent_deposit_withdraw_transition | vault_lifecycle | Interleaved referral-fee deposits and permissionless withdrawals could reuse a stale deposited amount, lose a post-withdraw deposit, or route a payout through a destroyed/redeployed vault incorrectly. | 125 | deadend_with_proof |
| AD1 | lp_account_both_positive_flag_mint_gate | mint_gate | A caller-controlled `both_positive` bit could cross router → pool → LP-account boundaries and mint LP against mismatched token legs or bypass the pool’s reserve accounting. | 126 | deadend_with_proof |
| AD2 | pool_provide_lp_parser_error_refund_typing | parser_refund | Truncated or malformed provide-LP payloads could select a wrong error/refund tuple while the original token legs remain committed in the router/pool chain. | 127 | deadend_with_proof |
| AD3 | router_nested_route_payload_tail_boundary | nested_route | Trailing or nested payload cells could alter the selected pool/token wallet or caller across cross-swap recursion while preserving the Router sender check. | 128 | deadend_with_proof |
| AD4 | vault_deposited_amount_coin_serialization_limit | coin_width | Repeated router referral-fee deposits could cross the 120-bit coin serialization boundary and leave a vault unable to withdraw or redirect a stored fee. | 129 | deadend_with_proof |
| AD5 | lp_account_mint_destroy_save_order | callback_lifecycle | LP-account minting with `DESTROY_IF_ZERO` and a subsequent save could resurrect stale amounts or duplicate a callback after pool rejection. | 130 | deadend_with_proof |
| AE1 | pool_swap_referral_output_send_order | message_ordering_fees | A swap referral-vault message and normal output message could diverge in amount, token side, or completion while Pool saves reserves after both sends. | 131 | deadend_with_proof |
| AE2 | pool_protocol_fee_dual_payload_delivery | payload_aliasing | Protocol-fee collection’s two optional payloads or sequential one-sided payout messages could alter fee-leg identity or counter clearing after one downstream leg fails. | 132 | killed_trusted_on_trusted |
| AE3 | router_notification_without_ref_refund_source | error_refund | A no-reference jetton notification could make Router refund to an attacker-shaped sender/from tuple without a valid Router token-wallet identity. | 133 | deadend_with_proof |
| AE4 | router_vault_pay_to_recipient_stateinit | state_init_asset_binding | A vault_pay_to tuple could pass the derived-vault sender check while redirecting a stored referral amount to another token wallet or owner. | 134 | deadend_with_proof |
| AE5 | lp_wallet_transfer_response_excess_commit | token_conservation | LP-wallet transfer response/excess handling or a forward-payload boundary could commit a debit while causing duplicate credit, wrong destination state-init, or unaccounted bounce restoration. | 135 | deadend_with_proof |
| AF1 | lp_wallet_bounced_header_spoof_restore | bounce_accounting | A bounced header/body with an allowed opcode could make LP-wallet `on_bounce` restore a balance without a matching outbound debit. | 136 | deadend_with_proof |
| AF2 | pool_burn_payload_wrapper_leg_split | payload_aliasing | The LP-burn custom-payload wrapper could split payload refs across two output legs while reserve/supply accounting remained committed. | 137 | deadend_with_proof |
| AF3 | router_admin_reset_pool_gas_recipient | privileged_state | Admin reset-pool-gas recipient selection could redirect carried value or affect pool state across the Router → Pool boundary. | 138 | killed_trusted_on_trusted |
| AF4 | pool_reset_gas_body_tail_parse | parser_refund | A reset-gas body with trailing or malformed fields could select an unintended excess recipient or mutate Pool token state. | 139 | killed_trusted_on_trusted |
| AF5 | getter_response_state_alias | async_response_correlation | An asynchronous getter response could alias a different query, redirect to another caller, or mutate Pool/LPAccount state. | 140 | deadend_with_proof |

## Cell execution contract

Iter 1 executes only `P1xC2`. A surviving candidate needs a production-reachable call chain, selected-asset anchors, direct attacker/victim balance deltas, caller grep, cascade verbatim hits, prior-art queries, and an on-disk PoC plus run log. A source-only concern becomes `DEADEND_WITH_PROOF` or a named blocked lane in the iteration status.

## Post-matrix expansion — Iter 141+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AG1 | opcode_dispatch | opcode_collision | Masked CRC32 opcode values across selected dispatchers may collide and route a value-bearing body into the wrong handler. | 1 | deadend_with_proof |
| AG2 | lp_wallet_identity | state_init_alias | Owner/master/code tuple interpretation may differ across selected LP-wallet producers and consumers. | 2 | pre_killed_duplicate (overlaps U4/R8/AB4) |
| AG3 | callback_dispatch | operation_typing | A valid callback sender plus a semantically wrong body shape may cross a selected contract boundary. | 3 | deadend_with_proof |
| AG4 | vault_lifecycle | stale_redeploy_state | Destroy/redeploy ordering may reuse referral amount or beneficiary state. | 4 | pre_killed_duplicate |
| AG5 | carry_reserve_flow | value_split | Carry/reserve behavior may commit token state while a TON reserve failure changes rollback semantics. | 5 | PRE_KILLED_DUPLICATE |

| AH1 | pool_storage | layout_alias | Pool-family state-init and storage field order may reinterpret reserves, LP supply, or fee counters. | 1 | deadend_with_proof |
| AH2 | router_storage | upgrade_ref_arity | Router upgrade reference fields may be dropped or aliased across a save/load boundary. | 2 | deadend_with_proof |
| AH3 | pool_dispatch | sender_precedence | Overlapping configured roles may route a message into the wrong Pool branch. | 3 | killed_trusted_on_trusted |
| AH4 | lp_account_storage | coin_arity | LP-account two-coin storage may swap or alias accumulated liquidity fields. | 4 | deadend_with_proof |
| AH5 | interface_payload | ref_arity | Optional payload/reference slots may be consumed under the wrong downstream field type. | 5 | pre_killed_duplicate (Q3/V5/X5/AC4) |

| AI1 | variant_extension_wiring | interface_consistency | Compile-time `dexType` extension includes may omit, duplicate, or miswire a variant Pool/Router admin handler, causing a value-bearing message builder/consumer mismatch across the selected family. | 1 | deadend_with_proof |
| AI2 | lp_wallet_state_init_encoding | state_init_alias | `store_dict` StateInit code/data encoding in LP-wallet jetton utilities may diverge from the `store_ref` runtime code/data tuple and create a deterministic wallet alias. | 2 | pre_killed_duplicate (U4/AG2) |
| AI3 | variant_state_init_asm_literal | state_init_asset_binding | Variant-specific inline-ASM defaults may serialize a different lock/fee/weight literal from the typed state-init builder and produce a pool address whose runtime static tuple differs. | 3 | deadend_with_proof |
| AI4 | deploy_config_variant_binding | deployment_identity | Router deployment configuration may select a dexType/code library combination different from the generated Router/Pool pair, causing callbacks or value messages to target an unintended selected-asset implementation. | 4 | pre_killed_oos |
| AI5 | weighted_setter_ref_forwarding | privileged_state | Weighted-stableswap setter address packed through Router extension refs may be dropped, shifted, or replaced at the Pool consumer, changing future rate-authority identity. | 5 | pre_killed_duplicate_trusted_role (P10xC2/Q4/U5) |

| AJ1 | weighted_stableswap_solver | convergence_guard | Weighted-stableswap `solve_dx`/`solve_dy` derivative-zero, epsilon, and 255-iteration guards may accept an under-converged output or leave a reserve delta on a catch path. | 1 | deadend_with_proof |
| AJ2 | stableswap_invariant_solver | denominator_boundary | Stableswap invariant and output solvers may divide by a zero/near-zero denominator at extreme amplification/reserve ratios and release an unbacked output. | 2 | deadend_with_proof |
| AJ3 | weighted_const_product_ratio_guard | max_ratio_boundary | The weighted-constant-product 0.3 input-ratio limit may be applied to one direction but not its complement, allowing a reserve/invariant mismatch. | 3 | deadend_with_proof |
| AJ4 | constant_product_invariant_iteration | precision_rounding | Constant-product Newton iteration and normalized invariant rounding may mint or fee-credit a residual not backed by reserves. | 4 | deadend_with_proof |
| AJ5 | cross_variant_math_signature | interface_consistency | Variant `get_swap_out`/LP-provide/burn signatures may receive a different side/fee/invariant argument order under generated family selection. | 5 | deadend_with_proof |

| AK1 | cross_variant_math_intermediate_bitwidth | arithmetic_overflow | Fixed-point products, reserve products, exponent intermediates, and fee multiplications may exceed the TVM signed-integer width at max 120-bit coin inputs before output or reserve checks, creating a wrapped or malformed value-bearing result. | 1 | deadend_with_proof |
| AK2 | pool_fee_aggregate_floor_ceiling | arithmetic_rounding | Sequential protocol/referral ceil fees combined with LP-fee floor rounding may subtract more than the computed output on a successful branch after a variant-specific base-output round. | 2 | deadend_with_proof |
| AK3 | lp_supply_coin_serialization_boundary | coin_width | LP supply deltas and reserve-derived mint/burn amounts may cross the 120-bit coin serialization boundary in a successful LP callback before the max-supply guard. | 3 | deadend_with_proof |
| AK4 | variant_setter_deserialization_width | serialization_alias | Amp, weight, and rate setter fields may deserialize at a width different from the corresponding pool storage field, truncating a value or activating a different math domain. | 4 | deadend_with_proof |
| AK5 | invariant_preservation_after_fee_state | accounting_conservation | Variant-specific LP-provide fee deductions may reduce the post-fee invariant while still minting LP supply or recording protocol fees. | 5 | deadend_with_proof |
| AM1 | lp_mint_bounce_pool_commit | bounce_accounting | Pool callback commits LP supply/reserves before the outbound LP-wallet mint is durably credited; a bounce or receiver-side failure could leave value-bearing pool state without the corresponding LP balance. | 1 | deadend_with_proof |
| AM2 | lp_mint_notification_failure | async_message_ordering | A user-controlled forward amount/payload can make the LP-wallet transfer notification fail after LP balance credit, causing a mismatch between minted LP and notification-side state. | 2 | deadend_with_proof |
| AM3 | lp_account_zero_lp_donation_price | accounting_conservation | A zero-minimum LP provide that returns zero liquidity can still add reserves, potentially shifting the pool price/invariant for existing LPs without a share issuance. | 3 | deadend_with_proof |
| AM4 | lp_wallet_invalid_owner_state_init | destination_binding | An unvalidated LP recipient form could produce a wallet StateInit that is unreachable or aliases a different owner while the Pool has already committed LP supply. | 4 | deadend_with_proof |
| AM5 | lp_mint_carry_value_commit | gas_accounting | CARRY_ALL_BALANCE on the LP mint path could alter bounce/value behavior so a successful Pool save is followed by an incomplete mint or residual-value diversion. | 5 | deadend_with_proof |
| AN1 | lp_callback_user_to_user_identity | cross_contract_identity | Pool callback user_address authenticates the LP-account sender while to_user_address selects the LP-wallet owner; a mismatch or parser shift could mint LP against one user’s deposit to another identity with an unintended excess/notification route. | 1 | deadend_with_proof |
| AN2 | lp_wallet_mint_from_address_notification | notification_identity | The mint body’s from_address is user-controlled through the callback and is forwarded to transfer_notification; a mismatch between from_address and wallet owner could cause downstream routing to treat minted LP as another source. | 2 | deadend_with_proof |
| AN3 | lp_callback_refund_excess_identity_split | error_refund | On Pool rejection, refund_address and excess_address are carried separately from user_address; a tuple-shape or state-init mismatch could return token legs to a different account while preserving the original LP-account state. | 3 | deadend_with_proof |
| AN4 | lp_wallet_response_address_workchain | destination_binding | LP-wallet excess routing checks only address form bits at receive time; a noncanonical response/excess address could redirect residual TON or alter bounce behavior after LP credit. | 4 | deadend_with_proof |
| AN5 | lp_account_callback_replay_query_identity | replay_correlation | Replaying a valid callback body with a different query_id or user/to_user tuple could re-use an LP-account state transition or duplicate LP mint across asynchronous messages. | 5 | deadend_with_proof |
| AO1 | pool_swap_trycatch_reserve_rollback | state_rollback | The Pool swap branch mutates reserves and protocol/referral fee counters before postcondition checks inside a try/catch; a caught failure could persist a partial state update or create a reserve/fee mismatch while the Router refunds the input. | 1 | deadend_with_proof |
| AO2 | router_pay_vault_token_side_binding | asset_binding | Router pay_vault derives one Vault from owner, the selected token side, and Router, then deposits amount0_out + amount1_out; a mixed-side payload or selector mismatch could credit one token’s Vault with another side’s amount. | 2 | deadend_with_proof |
| AO3 | vault_withdraw_owner_token_router_binding | withdrawal_identity | Anyone may trigger a Vault withdrawal, while the Vault sends the balance to its owner through Router; a StateInit tuple or token/router mismatch could redirect accrued referral fees. | 3 | deadend_with_proof |
| AO4 | router_transfer_bounce_refund_payload | bounce_refund | Router transfer-bounce handling derives refund/excess destinations from user-controlled DexPayload fields and emits a jetton transfer on caught validation errors; a bounce-path field shift could send returned tokens to the wrong identity. | 4 | deadend_with_proof |
| AO5 | pool_protocol_fee_dual_leg_release | fee_release | Pool collect_fees requires both protocol-fee legs to be positive, clears both counters after two Router pay_to messages, and relies on asynchronous delivery; a zero-leg or partial-send path could strand or duplicate one fee leg. | 5 | killed_trusted_on_trusted |

| AP1 | pool_burn_response_addr_none_gate | destination_binding | The LP-wallet burn callback accepts only `addr_none()` as response_address; a parser/tag boundary could admit a noncanonical response identity or reject a valid burn after Pool state has been debited. | 1 | deadend_with_proof |
| AP2 | lp_account_cb_refund_dual_leg_mode_split | gas_accounting | The Pool refund callback uses NORMAL for two positive legs and CARRY_REMAINING_GAS for a one-sided leg; a boundary could underfund or duplicate the second token refund after LP-account state is cleared. | 2 | deadend_with_proof |
| AP3 | pool_provide_callback_to_user_deferred_wallet | destination_binding | The authenticated LP-account user and separately selected to_user LP-wallet owner could diverge at the callback, making a committed LP mint unreachable or crediting an unintended wallet. | 3 | deadend_with_proof |
| AP4 | vault_withdraw_permissionless_replay | replay_correlation | Permissionless Vault withdrawal could replay a stored referral amount or race the zeroing save so one accrued fee is paid twice. | 4 | deadend_with_proof |
| AP5 | router_vault_pay_to_amount_tuple | asset_binding | A vault_pay_to amount/token/owner tuple could be accepted from a deterministic Vault while selecting the wrong token wallet or amount for the stored referral fee. | 5 | deadend_with_proof |

| AQ1 | pool_lp_provide_math_exception_zero_mint_commit | accounting_conservation | A caught LP-provide math exception combined with min_lp_out = 0 could commit input reserves and protocol counters while minting zero LP, allowing an attacker to distort the pool price or extract value from existing LPs. | 1 | deadend_with_proof |
| AQ2 | pool_lp_provide_fee_counter_exception_split | fee_accounting | A variant-specific LP-provide exception could leave token fee counters and reserve additions out of sync when one fee leg is zero and the callback still saves. | 2 | deadend_with_proof |
| AQ3 | pool_lp_mint_zero_forward_payload_commit | async_message_ordering | A zero-LP mint with forward payload or insufficient forward gas could save Pool state before the LP-wallet message completes, leaving a reserve/supply mismatch. | 3 | deadend_with_proof |
| AQ4 | router_provide_both_positive_exception_flag | branch_selection | A caller-controlled both_positive flag combined with a zero minimum could route a single-sided or exception path into a two-sided LP-account state transition. | 4 | deadend_with_proof |
| AQ5 | pool_lp_provide_max_input_exception | arithmetic_boundary | Max-width LP-provide inputs could throw after partial fee/reserve mutation and still reach a successful save branch under a zero minimum. | 5 | deadend_with_proof |

## Post-matrix expansion — Iter 188+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AR1 | router_notification_pair_mixing | sender_binding / asset_binding | An arbitrary transfer notification sender paired with an existing Router-owned wallet may create a sorted fake/real Pool pair whose LP burn debits the real wallet. | 1 | deadend_with_proof |
| AR2 | router_owned_wallet_residual_debit | amount_conservation | A fake-pair pay_to output may consume Router token-wallet residuals left by another pool. | 2 | deadend_with_proof |
| AR3 | pool_pair_sort_notification_order | state_init_asset_binding | Notification order may preserve Pool identity but invert amount-leg assignment. | 3 | deadend_with_proof |
| AR4 | lp_burn_fake_pair_supply_release | token_conservation | Unbacked fake-pair LP supply may release a proportional output from a real Router wallet. | 4 | deadend_with_proof |
| AR5 | router_notification_existing_wallet_collision | cross_contract_identity | Notification sender/from_address/wallet identity composition may route a forged pair into a selected real wallet. | 5 | deadend_with_proof |

## Post-matrix expansion — Iter 193+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AS1 | router_pay_to_cross_swap_recursion | async_reentry / amount_conservation | A Pool-controlled `pay_to` custom payload can select `cross_swap`, causing Router output handling to recurse into a second route while the first output balance/state transition is still in flight. | 1 | deadend_with_proof |
| AS2 | lp_burn_dual_output_bounce_correlation | bounce_accounting | The two burn `pay_to` legs use separate messages and carry modes; a bounce or partial receiver failure could restore one wallet-side amount while Pool reserves/supply remain committed. | 2 | deadend_with_proof |
| AS3 | router_pay_vault_vault_collision | state_init_alias | A `pay_vault` token/owner tuple may collide with a real Vault or LP wallet StateInit, redirecting a referral-fee deposit across selected assets. | 3 | deadend_with_proof |
| AS4 | pool_upgrade_ref_partial_state | upgrade_state | Admin Pool code-update messages may change executable code without a synchronized static/storage reference, creating a value-bearing callback interpretation split. | 4 | killed_trusted_on_trusted |
| AS5 | getter_wallet_address_code_identity | state_init_alias | Getter-derived LP wallet addresses may diverge from mint/burn StateInit code/data after variant selection, causing an output to reach a different wallet identity. | 5 | deadend_with_proof |

## Post-matrix expansion — Iter 198+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AT1 | router_notification_no_ref_wallet_refund | sender_binding / amount_conservation | A no-reference transfer notification may refund from_address through the notifying wallet without proving the notifying wallet is the Router-owned token wallet, producing a cross-wallet refund. | 3 | deadend_with_proof |
| AT2 | lp_account_refund_destroy_redeploy_identity | lifecycle / replay_correlation | `CARRY_ALL_BALANCE | DESTROY_IF_ZERO` on refund may race the post-send zero/save transition so a redeployed LP account retains stale liquidity or can replay a refund. | 4 | deadend_with_proof |
| AT3 | lp_account_direct_add_zero_selector_residual | amount_conservation / branch_selection | Direct-add treats a zero requested amount as “use all stored amount”; a mixed zero/nonzero selector could subtract one full stored leg while retaining or misrouting the other leg across the Pool callback. | 1 | deadend_with_proof |
| AT4 | pool_callback_minimum_zero_selector | accounting_conservation / minimum_output | A zero minimum or one-sided callback tuple may allow a Pool callback to commit token reserves while minting no LP or route an unintended side through the LP-account fallback. | 2 | deadend_with_proof |
| AT5 | router_pay_to_empty_custom_payload_ref | parser_boundary / async_message_ordering | An empty or malformed custom-payload reference at Router pay_to may switch between transfer and route handling while preserving a stale amount/token side. | 5 | deadend_with_proof |

## Post-matrix expansion — Iter 203+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AU1 | pool_getter_provide_wallet_include_address_alias | read_only_identity | The `include_address` bit in the Pool wallet-discovery getter may shift the returned wallet or embedded owner address and bind a later transfer to another LP wallet. | 4 | deadend_with_proof |
| AU2 | pool_protocolfee_zero_payload_ref_split | fee_release / async_message_ordering | Dual protocol-fee pay_to messages with independently optional payload refs may clear both counters after only one usable leg, duplicating or stranding the second fee. | 1 | killed_trusted_on_trusted |
| AU3 | pool_protocolfee_recipient_tuple_binding | sender_binding / fee_release | The protocol fee recipient is carried as owner/excess/original caller in both pay_to messages; a tuple mismatch could route one fee leg to a caller-controlled address. | 2 | killed_trusted_on_trusted |
| AU4 | router_getter_pair_workchain_addr_none | read_only_boundary | A getter pair with valid workchains but unusual address forms may derive a Pool StateInit distinct from route-time token wallet addresses. | 3 | deadend_with_proof |
| AU5 | pool_getter_fee_counter_visibility | read_only_state | Getter output may expose stale fee counters across a collect-fees clear/save boundary and induce an off-chain repeat collection. | 5 | deadend_with_proof |

## Post-matrix expansion — Iter 208+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AV1 | vault_withdraw_destroy_redeposit_code_identity | lifecycle / state_init_alias | Vault withdrawal uses `DESTROY_IF_ZERO` while clearing deposited state; a destroy/redeploy boundary could reuse a stale owner/token/router tuple or expose a prior deposited amount. | 4 | DEADEND_WITH_PROOF |
| AV2 | lp_wallet_send_tokens_stateinit_bounce_debit_restore | bounce_accounting / async_message_ordering | LP-wallet transfer debits before emitting a StateInit-backed internal transfer; a deployment or bounce boundary could restore the wrong amount or leave a debit without the matching destination wallet credit. | 1 | DEADEND_WITH_PROOF |
| AV3 | router_notification_ref_forward_payload_boundary | parser_boundary / branch_selection | A transfer notification with a ref whose payload is empty, truncated, or nested could cross the Router route/refund branch with a shifted caller or token-wallet identity. | 3 | DEADEND_WITH_PROOF |
| AV4 | pool_pay_vault_both_positive_side_selector | asset_binding / amount_conservation | If both referral-fee legs are positive, Router selects the Vault token by `amount0_out > 0` while depositing their sum; a dual-leg case could aggregate two token assets into one Vault. | 2 | KILLED_TRUSTED_ON_TRUSTED |
| AV5 | router_vault_getter_addr_none_identity | read_only_boundary / state_init_alias | Router’s Vault address getter may accept unusual owner/token address forms differently from the value-bearing `vault_pay_to` sender check and derive a misleading Vault identity. | 5 | DEADEND_WITH_PROOF |

## Post-matrix expansion — Iter 213+

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AW1 | router_pay_vault_stateinit_bounce_fee_stranding | bounce_accounting / async_commit | Pool commits swap/referral accounting before Router sends a StateInit-backed Vault deposit; a deposit bounce or deployment boundary could strand the referral fee after reserve mutation. | 1 | DEADEND_WITH_PROOF |
| AW2 | vault_deposit_ref_fee_tail_response_isolation | parser_boundary / excess_routing | Vault parses amount and response address without `end_parse`; trailing body data might shift excess routing or persist an amount with an unintended response field. | 3 | DEADEND_WITH_PROOF |
| AW3 | lp_wallet_master_source_auth_alias | sender_auth / state_init_identity | LP-wallet `receive_tokens` accepts either the configured master or the deterministic source wallet; a source/master tuple edge could credit a wallet under an unintended owner. | 2 | DEADEND_WITH_PROOF |
| AW4 | pool_root_lp_wallet_lp_account_opcode_collision | dispatcher_order / caller_gate | Pool dispatches LP-wallet messages before LP-account messages; an opcode overlap or short body could reach the wrong handler before sender validation. | 4 | DEADEND_WITH_PROOF |
| AW5 | router_vault_code_upgrade_identity_drift | upgrade_lifecycle / address_replay | A Router vault-code upgrade could make existing Vault StateInit addresses diverge from future deposits/withdrawals, stranding or cross-binding referral balances. | 5 | KILLED_TRUSTED_ON_TRUSTED |

## AX fresh post-matrix expansion

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| AX1 | router_admin_temp_upgrade_tuple_rebinding | upgrade_state_machine / partial_finalize | `pack_temp_upgrade` and `unpack_temp_upgrade` carry Router-code, admin, and pool-code deadlines through one cell; a partial finalize/cancel sequence could rebind one pending field to another or leave a stale replacement code active. | 1 | KILLED_TRUSTED_ON_TRUSTED |
| AX2 | pool_internal_set_fees_tail_excess_address | admin_payload / parser_boundary | The Router-to-Pool internal fee-update body loads fee fields and an excess address without a terminal parse; a tail or optional address form could persist a fee recipient or strand carry value. | 2 | KILLED_TRUSTED_ON_TRUSTED |
| AX3 | router_route_dex_available_gas_exact_boundary | gas_budget / carry_mode | The Router route check uses a strict available-gas threshold before building a StateInit-backed Pool call; an exact-boundary payload may enter with insufficient downstream value and create a refund or accounting asymmetry. | 3 | DEADEND_WITH_PROOF |
| AX4 | lp_account_direct_add_post_send_commit_order | async_commit / residual_liquidity | Direct-add sends a Pool callback before saving the LP-account remainder; a downstream callback bounce or partial leg could leave stale liquidity available for a second direct-add. | 4 | DEADEND_WITH_PROOF |
| AX5 | pool_swap_refund_error_payload_amount_binding | error_encoding / refund_route | Swap failure branches encode error metadata beside fixed amount/token refund legs; a malformed error code or custom payload boundary could alter the refund amount or recipient selected downstream. | 5 | DEADEND_WITH_PROOF |
| AX6 | pool_getter_lp_account_address_user_stateinit | read_only_identity / state_init_binding | Pool's LP-account getter derives a StateInit address from the caller-supplied user address; an address-form or parser boundary could return an LP account identity different from the value-bearing callback identity. | 1 | DEADEND_WITH_PROOF |
| AX7 | pool_getter_data_tuple_field_alignment | read_only_schema / tuple_alignment | The Pool data getter emits a long reserve, fee, token, and counter tuple; a field-width or ordering mismatch could make downstream consumers bind a reported value to another asset or fee field. | 2 | PRE_KILLED_DUPLICATE |
| AX8 | router_jetton_notification_empty_ref_bounce_payload_tail | notification_ref / bounce_encoding | Router refunds a no-reference jetton notification through the notifying wallet using a fixed bounce payload; a tail or opcode boundary could alter the amount, destination, or downstream interpretation. | 3 | PRE_KILLED_DUPLICATE |
| AX9 | router_pay_vault_zero_side_token_selector | asset_binding / zero_side | Router `pay_vault` selects token1 whenever amount0 is zero while aggregating referral amounts; a zero-sided or dual-sided tuple boundary could route value to a wrong token wallet. | 4 | PRE_KILLED_DUPLICATE |
| AX10 | vault_deposit_ref_fee_response_tail_replay | parser_boundary / excess_routing | Vault deposits parse a referral amount and excess response address before saving; a trailing-body or repeated response boundary could misroute carried value or duplicate accounting. | 5 | PRE_KILLED_DUPLICATE |
| AX11 | lp_account_getter_data_tuple_identity | read_only_identity / tuple_binding | LP-account getter responses include user, Pool, and two stored balances; a response tuple ordering or source mismatch could make a caller associate one account's balances with another user or Pool. | 1 | PRE_KILLED_DUPLICATE |
| AX12 | lp_account_getter_data_coin_width_boundary | read_only_schema / coin_width | LP-account getter balance fields use Coins while storage is updated through multi-leg callbacks; a width or zero-boundary mismatch could expose a value different from the account's committed balances. | 2 | PRE_KILLED_DUPLICATE |
| AX13 | lp_account_getter_data_response_carry_destroy | read_only_carry / balance_flow | The LP-account getter returns with `CARRY_ALL_BALANCE | IGNORE_ERRORS`; an outbound response or failed recipient could alter account balance or destroy a value-bearing contract unexpectedly. | 3 | DEADEND_WITH_PROOF |
| AX14 | lp_account_getter_data_post_refund_snapshot | read_only_state / lifecycle | A getter immediately after refund, direct-add, or callback transitions may observe stale storage and feed a later stateful operation with another user's LP-account snapshot. | 4 | DEADEND_WITH_PROOF |
| AX15 | lp_account_root_getter_sender_gate_order | dispatch_order / sender_binding | LP-account root checks Pool/user senders before getter dispatch; an opcode collision or sender-form boundary could enter a getter branch with state-bearing context. | 5 | DEADEND_WITH_PROOF |
| AX16 | lp_account_reset_gas_user_destination_carry | carry_value / destination_binding | LPAccount `reset_gas` sends all remaining TON to the stored user address after only the root sender gate; a sender/destination or carried-balance boundary could redirect value or expose another user's account balance. | 1 | DEADEND_WITH_PROOF |
| AX17 | lp_account_reset_gas_empty_body_tail | parser_boundary / carry_value | LPAccount reset-gas accepts an opcode without terminal body parsing; a tail or malformed body could change the carried TON recipient or execution branch. | 2 | PRE_KILLED_DUPLICATE |
| AX18 | lp_account_reset_gas_user_workchain_binding | sender_binding / workchain | A reset-gas call from the stored user may send to a stored address form with a different workchain or `addr_none`, creating an unreachable or misrouted TON payout. | 3 | DEADEND_WITH_PROOF |
| AX19 | lp_account_reset_gas_storage_floor_boundary | reserve_floor / carry_value | `reserves::exact(storage_fee::lp_account)` precedes `CARRY_ALL_BALANCE`; a balance exactly at or below the reserve floor could strand or over-release LP-account TON. | 4 | DEADEND_WITH_PROOF |
| AX20 | lp_account_reset_gas_reentry_lifecycle | replay / state_persistence | A permissionless-looking reset-gas message after refund/direct-add lifecycle transitions could replay a carried payout or interact with LPAccount destruction/state clearing. | 5 | PRE_KILLED_DUPLICATE |
| AX21 | lp_wallet_receive_master_from_address_owner_binding | mint_authority / notification_identity | LPWallet accepts `internal_transfer` from its stored master and forwards a user-controlled `from_address` in `transfer_notification`; a master-mint tuple could bind minted LP to a wrong source or downstream Router route. | 1 | PRE_KILLED_DUPLICATE |
| AX22 | lp_wallet_receive_master_forward_amount_accounting | mint_authority / forward_value | Master-authorized receives subtract storage and forward TON costs before saving; a forward amount or message-value boundary could create an excess or notification without the matching LP balance. | 2 | DEADEND_WITH_PROOF |
| AX23 | lp_wallet_receive_user_wallet_stateinit_collision | sender_binding / state_init | The alternate receive path authenticates a deterministic wallet from `from_address`, master, and wallet code; a StateInit collision or address-form alias could credit the wrong LP wallet. | 3 | DEADEND_WITH_PROOF |
| AX24 | lp_wallet_receive_response_excess_destination | destination_binding / carry_value | Receive-token excesses are sent to a body-provided response address after the balance update; an address-form or carry boundary could redirect TON or couple it to minted LP. | 4 | DEADEND_WITH_PROOF |
| AX25 | lp_wallet_receive_forward_payload_notification_alias | payload_aliasing / notification_identity | The unconsumed receive body becomes a forward notification payload; a malformed tail could make Router parse a different operation or source while the wallet balance is already committed. | 5 | PRE_KILLED_DUPLICATE |


## BA fresh post-matrix expansion

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| BA1 | lp_account_pool_callback_additional_fields_tail_alias | parser_boundary / destination_binding | The Pool `cb_add_liquidity` additional-fields reference loads to_user, refund, and excess addresses without terminal parsing; a trailing or nested tail could shift a value-return destination while preserving the authenticated LPAccount callback. | 1 | PRE_KILLED_DUPLICATE |
| BA2 | lp_account_root_bounce_empty_body_precedence | bounce_accounting / parser_order | LPAccount rejects an empty body before checking the bounced flag; a bounced zero-body callback could alter failure semantics around pending liquidity or make a downstream bounce distinguishable from a normal malformed call. | 2 | PRE_KILLED_DUPLICATE |
| BA3 | lp_wallet_get_data_storage_tuple_staleness | read_only_schema / async_snapshot | LPWallet `get_wallet_data` returns balance, owner, master, and code after asynchronous transfers; a read snapshot or tuple-width boundary could cause an off-chain/stateful caller to bind a stale wallet identity or balance. | 3 | PRE_KILLED_DUPLICATE |
| BA4 | lp_wallet_burn_custom_payload_ref_forwarding | payload_reference / burn_identity | LPWallet burn loads a maybe-ref custom payload and forwards it to the master; a nested reference or tail boundary could alter burn owner/response interpretation after the wallet debit. | 4 | PRE_KILLED_DUPLICATE |
| BA5 | lp_wallet_bounce_query_id_noncorrelation | bounce_accounting / replay_correlation | LPWallet bounce restores the amount from the bounced body but does not correlate query_id to an outstanding debit; a replayed or cross-operation bounce body could inflate balance after a valid transfer or burn. | 5 | PRE_KILLED_DUPLICATE |

## BB fresh post-matrix expansion

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| BB1 | pool_burn_insufficient_gas_working_state | gas_budget / rollback | Pool burn subtracts reserves and LP supply before its strict gas check; an exact gas boundary could leave provisional reserve/supply mutation while the LPWallet debit or two Router payouts fail. | 1 | PRE_KILLED_DUPLICATE |
| BB2 | lp_wallet_bounce_truncated_body_parse | parser_boundary / bounce_accounting | A protocol-marked bounce with a truncated body could pass the bounce header path, parse an allowed opcode/amount prefix, and restore a malformed amount without a matching outbound debit. | 2 | PRE_KILLED_DUPLICATE |
| BB3 | router_pay_to_custom_payload_32bit_cutoff | parser_boundary / nested_route | Router pay_to treats payloads longer than 32 bits as cross-swap candidates; an exact 32/33-bit boundary could switch between ordinary transfer and nested route with different owner, amount, or excess semantics. | 3 | PRE_KILLED_DUPLICATE |
| BB4 | lp_wallet_send_state_init_funding_boundary | gas_budget / state_init | LPWallet transfer debits before building a StateInit-backed destination and checks message value only after parsing the destination/payload fields; an exact funding boundary could strand the debit or deploy a wrong wallet identity. | 4 | PRE_KILLED_DUPLICATE |
| BB5 | lp_wallet_receive_master_source_or_branch | sender_precedence / mint_authority | LPWallet receive accepts either the configured master or deterministic source wallet; an overlapping master/source identity or parser boundary could select the weaker branch and credit LP without the intended authority. | 5 | PRE_KILLED_DUPLICATE |

## CC fresh spiral clusters

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| CC1 | lp_wallet_receive_storage_fee_floor_notification_order | gas_budget / message_ordering | LPWallet receive credits balance before subtracting storage/gas and optional notification value; an exact TON floor could persist a mint while notification/excess actions fail or expose a carried-value mismatch. | 1 | PRE_KILLED_DUPLICATE |
| CC2 | router_notification_ref_root_depth_refund | parser_boundary / error_refund | A transfer notification whose reference root has a shallow or nested payload boundary could enter the route parser with a shifted refund owner while retaining the notifying wallet sender. | 2 | PRE_KILLED_DUPLICATE |
| CC3 | lp_account_callback_mint_carry_stateinit_order | async_commit / carry_value | LPAccount callback constructs a StateInit-backed LPWallet mint with CARRY_ALL_BALANCE before saving its own remainder; a carry or deployment boundary could commit callback state without the exact LP credit. | 3 | PRE_KILLED_DUPLICATE |
| CC4 | router_admin_set_fees_excess_bounce_order | privileged_state / bounce_accounting | The Router admin fee-update path emits Pool state changes and carries excess TON across nested messages; a bounce/order boundary could leave a partial fee tuple or route residual value to the wrong admin-side recipient. | 4 | KILLED_TRUSTED_ON_TRUSTED |
| CC5 | vault_storage_schema_end_parse_coin_tail | parser_boundary / state_persistence | Vault storage uses three addresses plus a Coins field and `end_parse`; a schema-tail or coin-width boundary across deposit/withdraw could load a shifted owner/token/router tuple before a value-bearing send. | 5 | PRE_KILLED_DUPLICATE |

## DD fresh spiral clusters

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| DD1 | pool_swap_referral_payout_normal_before_main_carry | async_order / fee_conservation | A successful Pool swap sends the referral-fee `pay_vault` message with NORMAL before the main token `pay_to` with CARRY_ALL_BALANCE and only then saves reserves; a recipient/state-init boundary could commit the fee leg while the main payout or Pool save diverges. | 1 | PRE_KILLED_DUPLICATE |
| DD2 | router_pay_to_normal_fwd_response_excess_split | carry_value / destination_binding | Router normal `pay_to` builds a jetton transfer with owner, excess, forward TON, and custom payload before QCARRY_ALL_BALANCE; a forward/excess split could route residual TON or notification value independently of the fixed token amount. | 2 | PRE_KILLED_DUPLICATE |
| DD3 | router_pay_vault_dual_side_selector_sum | asset_binding / amount_conservation | Router `pay_vault` selects the Vault token from the first positive output side while depositing the sum of both output legs; a side-selection boundary across Pool variants could bind a referral amount to the wrong Vault asset. | 3 | PRE_KILLED_DUPLICATE |
| DD4 | lp_wallet_receive_response_after_notification | async_order / excess_destination | LPWallet receive saves the credited balance only after optional notification and excess actions; a response-address form or notification failure could alter the saved credit or send residual TON to a different destination. | 4 | PRE_KILLED_DUPLICATE |
| DD5 | lp_account_direct_add_partial_redeploy_callback | lifecycle / state_persistence | Direct-add partial consumption subtracts selected stored legs and may use `DESTROY_IF_ZERO` on the callback; a redeploy or one-sided residual boundary could reintroduce a stale LPAccount amount into a later Pool callback. | 5 | PRE_KILLED_DUPLICATE |

## DE fresh spiral clusters

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| DE1 | lp_account_reset_gas_after_destroy_redeploy_floor | lifecycle / carry_value | A reset-gas call after full direct-add destruction or callback-failure redeploy could carry residual TON from a recreated LPAccount under an old user/pool tuple. | 1 | PRE_KILLED_DUPLICATE |
| DE2 | pool_cb_add_failure_redeploy_into_partial_account | callback_failure / state_persistence | Pool callback failure sends exact amounts into a deterministic LPAccount that may still hold partial residual legs; an accumulation or Coins-boundary could preserve stale amounts, duplicate refund value, or bypass the zero-minimum no-mint fallback. | 2 | PRE_KILLED_DUPLICATE |
| DE3 | pool_cb_add_liquidity_math_catch_zero_liquidity | math_failure / rollback | The Pool callback catches LP-liquidity math errors after provisional supply/reserve updates; a zero or negative liquidity result at the failure boundary could persist a partial pool tuple before the LPAccount refund path. | 3 | PRE_KILLED_DUPLICATE |
| DE4 | router_pay_vault_withdraw_after_zero_stateinit | lifecycle / identity | A Vault destroyed or zeroed after withdrawal could be recreated by a later pay_vault StateInit with a mismatched owner/token tuple while residual carry or response routing remains from the prior instance. | 4 | PRE_KILLED_DUPLICATE |
| DE5 | lp_wallet_bounce_notification_opcode_partition | bounce_accounting / dispatch_order | A bounced transfer_notification or excess body returning to LPWallet could meet the generic bounce path with an unrecognized opcode and alter receive/bounce persistence around a previously saved credit. | 5 | PRE_KILLED_DUPLICATE |

## DF fresh spiral clusters

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| DF1 | router_notification_wallet_code_identity | sender_binding / code_identity | Router authenticates a transfer notification only by the immediate sender/body tuple; a valid-looking notification from a noncanonical wallet code could enter pool derivation and move a real token leg across a forged pair. | 1 | PRE_KILLED_DUPLICATE |
| DF2 | lp_wallet_receive_precredit_sender_exception | exception_atomicity / sender_binding | LPWallet increments balance before validating master/derived-wallet sender; an exception or bounce boundary could preserve the precredit despite rejected provenance. | 2 | PRE_KILLED_DUPLICATE |
| DF3 | pool_cb_refund_msg_value_negative_split | gas_accounting / dual_leg | Two-sided callback refunds divide remaining message value while one-sided refunds carry all remaining gas; a low-value boundary could send one leg while retaining or duplicating the other. | 3 | PRE_KILLED_DUPLICATE |
| DF4 | pool_dispatch_protocol_router_opcode_precedence | dispatcher_order / caller_binding | Pool checks protocol-fee sender before Router and LPWallet handlers; a sender/address collision or opcode overlap could route a legitimate callback into the wrong state mutation branch. | 4 | KILLED_TRUSTED_ON_TRUSTED |
| DF5 | router_pay_to_zero_side_payload_split | branch_selection / amount_conservation | Router `pay_to` chooses token0 when amount0 is positive and token1 otherwise; a zero/zero or dual-output payload could select a wrong wallet while carrying a fixed amount tuple. | 5 | KILLED_SINGLE_BY_DESIGN |

## DG fresh exhaustion clusters

| Cell | Production mechanism P | Failure class C | Initial hypothesis | Priority | Status |
|---|---|---|---|---:|---|
| DG1 | router_cross_swap_hop_pool_stateinit_rebind | cross_hop_identity / state_init | Router pay_to can turn a Pool output into a second route using a custom cross-swap payload; a hop-specific token-wallet or Pool StateInit rebind could make the second hop pay a different asset pair while retaining the original caller. | 1 | PRE_KILLED_DUPLICATE |
| DG2 | router_cross_swap_hop_custom_payload_depth_switch | nested_route / parser_boundary | The Router detects cross-swap from the first 32 payload bits and forwards the same payload into route parsing; a nested-cell depth boundary could switch the second hop’s operation or refund/excess fields. | 2 | PRE_KILLED_DUPLICATE |
| DG3 | pool_root_bounce_precedence_before_sender_auth | bounce_dispatch / sender_binding | Pool returns immediately for bounced messages before sender-role dispatch; a bounced value-bearing callback could bypass a stateful handler or alter the observed failure branch for an in-flight output. | 3 | PRE_KILLED_DUPLICATE |
| DG4 | pool_internal_update_status_tail_recipient_carry | admin_payload / carry_value | Router-to-Pool status updates save the lock state and carry excess to a body-supplied recipient; a tail or address-form boundary could couple a trusted lock transition to a wrong residual-value destination. | 4 | KILLED_TRUSTED_ON_TRUSTED |
| DG5 | lp_account_initial_callback_minimum_supply_commit | initial_liquidity / state_persistence | Initial LP callback handling computes supply and reserves before minimum-supply and mint-output checks; a near-minimum or zero-liquidity boundary could commit reserves without a matching LP balance across the callback chain. | 5 | pending |
