# Post-matrix expansion — AI clusters

Generated after AH1–AH5 closure. These clusters target production mechanisms not yet isolated as a cell; prior cells are listed to prevent duplicate dispatch.

| Cell | Production mechanism P | Failure class C | New hypothesis | Priority | Dispatch decision |
|---|---|---|---|---:|---|
| AI1 | variant_extension_wiring | interface_consistency | Compile-time `dexType` extension includes may omit, duplicate, or miswire a variant Pool/Router admin handler, causing a value-bearing message builder/consumer mismatch across the selected family. Distinct from AH5 payload-shape review because it tests generated include/dispatch topology. | 1 | AUTO-PICK |
| AI2 | lp_wallet_state_init_encoding | state_init_alias | `store_dict` StateInit code/data encoding in LP-wallet jetton utilities may diverge from the `store_ref` runtime code/data tuple and create a deterministic wallet alias. Distinct from U4/AG2 only if encoding, not owner/master ordering, changes the address. | 2 | pending |
| AI3 | variant_state_init_asm_literal | state_init_asset_binding | Variant-specific inline-ASM defaults may serialize a different lock/fee/weight literal from the typed state-init builder and produce a pool address whose runtime static tuple differs. | 3 | pending |
| AI4 | deploy_config_variant_binding | deployment_identity | Router deployment configuration may select a dexType/code library combination different from the generated Router/Pool pair, causing callbacks or value messages to target an unintended selected-asset implementation. | 4 | pending |
| AI5 | weighted_setter_ref_forwarding | privileged_state | Weighted-stableswap setter address packed through Router extension refs may be dropped, shifted, or replaced at the Pool consumer, changing future rate-authority identity. | 5 | pending |

Auto-dispatched: AI1, highest expected evidence value because it compares all variant include, dispatch, builder, and consumer edges while remaining distinct from prior payload-alias cells.
