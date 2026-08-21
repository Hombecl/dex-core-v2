# Post-matrix cluster proposals 13

The Z cluster is exhausted without a survivor. These five AA cells target
remaining failure/redeployment and payout-boundary paths in the scoped entry
contracts.

| Cell | New cluster | Highest-EV question | Initial kill filter |
|---|---|---|---|
| AA1 | pool_callback_failure_redeploy_refund_binding | On locked/min-output/invalid-liquidity failure, can the pool's state-init redeployment LP account receive or redirect the original two token amounts under a mismatched refund/user identity? | none until caller chain is closed |
| AA2 | lp_account_add_liquidity_storage_merge | Can repeated `add_liquidity` messages merge amounts across users or after a failed pool callback, causing a later user to mint against another account's stored balance? | none until state test |
| AA3 | router_pay_to_excess_address_invalidation | Can malformed excess/refund addresses survive pool-to-router `pay_to` validation and cause token transfer value to be stranded or delivered to an unintended account? | TON-only if token owner remains bound |
| AA4 | pool_set_fees_protocol_recipient_boundary | Can a router-originated fee update set a protocol recipient/token pair that causes fee counters to accrue to an unreachable or unintended asset route? | privileged/trusted-on-trusted if only admin |
| AA5 | router_transfer_bounce_error_recipient | Can a route validation error encode a bounce code while selecting a caller/refund/excess address that changes who receives returned tokens? | recipient is caller-controlled by design |

Auto-pick: AA1, because the failure branch uses a fresh LP-account state init,
repackages both input amounts, and crosses pool → LP-account → pool again; it
offers the strongest unauthenticated state/asset-conservation test. 
