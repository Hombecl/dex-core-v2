# Post-matrix cluster proposals 7

The T-cluster expansion is complete with no shippable candidate. These U-clusters cover remaining initialization, asynchronous response, lifecycle, and role-boundary surfaces in the selected assets. U1 is auto-picked because an attacker-controlled first liquidity callback is the only remaining initialization path that can directly alter pool reserves and LP supply.

| Cluster | Label | Primary layer | Hypothesis | EV rank | Dispatch |
|---|---|---|---|---:|---|
| U1 | pool_first_liquidity_sender_initialization | sender_binding | A first liquidity callback can initialize an uninitialized pool under a caller-controlled LP account or static tuple, bypassing the router/token identity boundary and capturing reserves or LP supply. | 1 | Iter 81 DEADEND_WITH_PROOF |
| U2 | async_getter_response_address_confusion | sender_binding | An asynchronous getter callback can route a state-bearing response to a body-supplied address or alias another component’s response path. | 2 | Iter 82 DEADEND_WITH_PROOF |
| U3 | vault_destroy_recreate_deposit_order | state_persistence | Vault destruction after withdrawal and immediate state-init recreation can reorder deposits or make a pending fee claim spendable twice. | 3 | Iter 83 DEADEND_WITH_PROOF |
| U4 | lp_wallet_codecell_sender_collision | state_persistence | LP-wallet code-cell or owner/master ordering can make two deterministic LP wallets share a state identity across pools or users after code updates. | 4 | Iter 84 DEADEND_WITH_PROOF |
| U5 | weighted_rate_setter_domain_boundary | arithmetic_overflow | A weighted-stableswap rate update at a domain boundary can create invalid invariant arithmetic or reserve extraction through the setter callback. | 5 | AUTO-PICK → Iter 85; trusted-role filter applies |
