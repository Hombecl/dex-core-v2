const assert = require('node:assert/strict');
const fs = require('node:fs');

const lpAccount = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_account/msgs/pool.fc',
  'utf8',
);
const poolCallback = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_account.fc',
  'utf8',
);
const lpUser = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_account/msgs/user.fc',
  'utf8',
);

assert.match(lpAccount, /pool::cb_add_liquidity\(\s*storage::user_address,\s*storage::amount0,\s*storage::amount1,/s);
assert.match(lpAccount, /CARRY_ALL_BALANCE \| DESTROY_IF_ZERO/);
assert.match(lpAccount, /storage::amount0 = 0;\s*storage::amount1 = 0;\s*\} else \{/s);
assert.match(lpAccount, /storage::save\(\);\s*return \(true\);/s);
assert.match(poolCallback, /if \(storage::is_locked\)\s*\|\s*\(liquidity < min_lp_out\)\s*\|\s*\(storage::total_supply_lp > math::MAX_COINS\)/s);
assert.match(poolCallback, /lp_account::add_liquidity\(\s*tot_am0,\s*tot_am1,\s*0,\s*0,\s*true,/s);
const failureBranch = poolCallback.slice(poolCallback.indexOf('if (storage::is_locked)'), poolCallback.indexOf('} else {', poolCallback.indexOf('if (storage::is_locked)')));
assert.equal(failureBranch.includes('storage::save();'), false);
assert.match(poolCallback, /msgs::send_with_stateinit\(\s*0,\s*lp_account_new~address\(params::workchain\),/s);
assert.match(poolCallback, /msgs::send_with_stateinit\(\s*0,\s*lp_wallet~address\(params::workchain\),/s);
assert.match(poolCallback, /storage::save\(\);/);
assert.match(lpUser, /storage::amount0 -= am0;\s*storage::amount1 -= am1;/s);
assert.match(lpUser, /pool::cb_add_liquidity\(\s*ctx\.at\(SENDER\),\s*am0,\s*am1,/s);

function mintFromAccount(state, amount0, amount1, minLpOut, bothPositive) {
  const next = { ...state, amount0: state.amount0 + amount0, amount1: state.amount1 + amount1 };
  const gate = minLpOut > 0n && (bothPositive ? next.amount0 > 0n && next.amount1 > 0n : next.amount0 + next.amount1 > 0n);
  if (!gate) return { state: next, callback: null, destroyed: false };
  return {
    state: { ...next, amount0: 0n, amount1: 0n },
    callback: { amount0: next.amount0, amount1: next.amount1, minLpOut },
    destroyed: true,
  };
}

function poolCallbackStep(pool, callback, succeeds) {
  if (!succeeds) {
    // The failure branch sends a fresh LP-account state-init but does not save
    // the pool's tentative globals; the claims remain pending in that account.
    return { pool, replacement: { amount0: callback.amount0, amount1: callback.amount1 }, minted: 0n };
  }
  return {
    pool: { ...pool, reserve0: pool.reserve0 + callback.amount0, reserve1: pool.reserve1 + callback.amount1, supply: pool.supply + 6n },
    replacement: null,
    minted: 6n,
  };
}

const initial = { amount0: 2n, amount1: 3n };
const outbound = mintFromAccount(initial, 4n, 5n, 1n, true);
assert.deepEqual(outbound.callback, { amount0: 6n, amount1: 8n, minLpOut: 1n });
assert.deepEqual(outbound.state, { amount0: 0n, amount1: 0n });
assert.equal(outbound.destroyed, true);

const pool = { reserve0: 100n, reserve1: 200n, supply: 1000n };
const failed = poolCallbackStep(pool, outbound.callback, false);
assert.deepEqual(failed.pool, pool);
assert.deepEqual(failed.replacement, { amount0: 6n, amount1: 8n });
assert.equal(failed.minted, 0n);

const retry = mintFromAccount(failed.replacement, 0n, 0n, 0n, true);
assert.equal(retry.callback, null);
assert.deepEqual(retry.state, failed.replacement);
const success = poolCallbackStep(pool, outbound.callback, true);
assert.equal(success.minted, 6n);
assert.deepEqual(success.pool, { reserve0: 106n, reserve1: 208n, supply: 1006n });

console.log('AD5 lifecycle edge check passed: mint clears/destroys once, failed callback leaves pool globals uncommitted and rehomes exact claims, while success commits once');
