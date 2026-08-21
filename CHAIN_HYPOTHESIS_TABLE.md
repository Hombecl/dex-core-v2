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

## Cell execution contract

Iter 1 executes only `P1xC2`. A surviving candidate needs a production-reachable call chain, selected-asset anchors, direct attacker/victim balance deltas, caller grep, cascade verbatim hits, prior-art queries, and an on-disk PoC plus run log. A source-only concern becomes `DEADEND_WITH_PROOF` or a named blocked lane in the iteration status.
