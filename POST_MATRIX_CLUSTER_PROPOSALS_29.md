# Post-matrix expansion — Iter188+ AR clusters

AQ1–AQ5 are closed. Existing notification reviews (Iter51/68/102/133/169)
treated a forged notification as an isolated fresh pair; this expansion tests
the unclosed composition where the forged sender is paired with an existing
Router-owned token-wallet address and the StateInit pair is hash-sorted.

| Cell | Production mechanism | Failure class | New hypothesis | Priority | Selection |
|---|---|---|---|---:|---|
| AR1 | router_notification_pair_mixing | sender_binding / asset_binding | An arbitrary `transfer_notification` sender can be combined with an existing Router-owned token wallet in the other-token field; sorted Pool StateInit may make both legs reach one fake/real pair, and a forged LP burn may then make Router transfer real wallet-held tokens to the attacker. | 1 | AUTO-PICK |
| AR2 | router_owned_wallet_residual_debit | amount_conservation | A fake-pair `pay_to` output can consume Router token-wallet residuals left by an unrelated selected pool even when the forged pair itself supplied no real tokens. | 2 | pending |
| AR3 | pool_pair_sort_notification_order | state_init_asset_binding | Reversing notification order around the pair hash sort may change amount-leg assignment without changing Pool identity, causing reserve and payout legs to diverge. | 3 | pending |
| AR4 | lp_burn_fake_pair_supply_release | token_conservation | A fake pair can initialize LP supply from unbacked notification amounts and release a proportional output from a real Router-owned wallet before LP-wallet balance restoration. | 4 | pending |
| AR5 | router_notification_existing_wallet_collision | cross_contract_identity | Body `from_address`, notification sender, and Router-owned wallet StateInit identity may be combined to make a forged pool’s refund/burn recipient resolve to a selected real wallet route. | 5 | pending |

## Selection rationale

AR1 has the highest EV because it joins an external notification entrypoint,
pair sorting, selected Router/Pool StateInit, LP mint/burn, and a direct
attacker-positive wallet delta. The drill will use source anchors, a fake
notification sender, an existing Router token wallet, and before/after wallet
balances; any missing real-wallet balance premise will be recorded as a
concrete blocker rather than inferred.
