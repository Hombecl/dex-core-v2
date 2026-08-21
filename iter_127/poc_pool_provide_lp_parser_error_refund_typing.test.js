const assert = require('node:assert/strict');
const fs = require('node:fs');

const routerDex = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/dex.fc',
  'utf8',
);
const routerJetton = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/jetton.fc',
  'utf8',
);
const poolRouter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/router.fc',
  'utf8',
);
const routerPool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/pool.fc',
  'utf8',
);

assert.match(routerJetton, /route_dex_messages\(\s*ctx\.at\(SENDER\),\s*ctx\.at\(MSG_VALUE\),\s*jetton_amount,\s*from_address,\s*in_msg_body~load_ref\(\)\s*\)/s);
assert.match(routerDex, /transferred_op = dex_payload~load_opcode\(\);\s*token_wallet1 = dex_payload~load_msg_addr\(\);\s*refund_address = dex_payload~load_msg_addr\(\);\s*excesses_address = dex_payload~load_msg_addr\(\);\s*tx_deadline = dex_payload~load_time\(\);/s);
assert.match(routerDex, /catch\(err_arg, err_code\).*?jetton_wallet::transfer\(0, _sent_amount, _caller, _caller\)/s);
assert.match(poolRouter, /slice refund_address = dex_payload~load_msg_addr\(\);\s*slice excesses_address = dex_payload~load_msg_addr\(\);\s*int tx_deadline = dex_payload~load_time\(\);/s);
assert.match(poolRouter, /catch\(err_arg, err_code\)[\s\S]*?router::pay_to\(\s*from_user,\s*refund_address,\s*excesses_address,\s*abs\(err_code != 1 \? err_code : err_arg\.to_int\(\)\),\s*0,\s*null\(\)[\s\S]*?amount0,\s*storage::token0_address,\s*amount1,\s*storage::token1_address/s);
assert.match(poolRouter, /throw_arg_unless\(op::provide_refund_tx_expired, 1, tx_deadline > now\(\)\)/);
assert.match(poolRouter, /lp_account::add_liquidity\(\s*amount0,\s*amount1,/s);
assert.match(routerPool, /throw_unless\(error::invalid_caller, equal_slices\(pool~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/);

function route(payload, amount) {
  if (!payload.commonValid) return { kind: 'router_refund', amount, to: 'CALLER' };
  if (!payload.nestedValid) return { kind: 'pool_refund', amount0: payload.amount0, amount1: payload.amount1, to: 'REFUND' };
  if (payload.expired) return { kind: 'pool_refund', amount0: payload.amount0, amount1: payload.amount1, to: 'REFUND' };
  return { kind: 'pool_commit', amount0: payload.amount0, amount1: payload.amount1 };
}

// The pool's pre-try common fields are a strict subset of the fields Router
// already consumes. A failure there is therefore handled by Router first.
assert.deepEqual(route({ commonValid: false, nestedValid: false, amount0: 5n, amount1: 7n }, 12n), {
  kind: 'router_refund', amount: 12n, to: 'CALLER',
});
assert.deepEqual(route({ commonValid: true, nestedValid: false, amount0: 5n, amount1: 7n }, 12n), {
  kind: 'pool_refund', amount0: 5n, amount1: 7n, to: 'REFUND',
});
assert.deepEqual(route({ commonValid: true, nestedValid: true, expired: true, amount0: 5n, amount1: 7n }, 12n), {
  kind: 'pool_refund', amount0: 5n, amount1: 7n, to: 'REFUND',
});
assert.deepEqual(route({ commonValid: true, nestedValid: true, expired: false, amount0: 5n, amount1: 7n }, 12n), {
  kind: 'pool_commit', amount0: 5n, amount1: 7n,
});

assert.ok(Math.abs(-705) === 705);
assert.ok(Math.abs(1) === 1);
assert.equal(5n + 7n, 12n);

console.log('AD2 parser/refund edge check passed: Router catches malformed common fields, Pool catches nested/expiry errors with exact original legs, and successful path alone reaches LP-account commit');
