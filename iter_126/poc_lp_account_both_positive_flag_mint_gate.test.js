const assert = require('node:assert/strict');
const fs = require('node:fs');

const poolRoute = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/router.fc',
  'utf8',
);
const lpAccount = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_account/msgs/pool.fc',
  'utf8',
);
const poolCallback = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_account.fc',
  'utf8',
);

assert.match(poolRoute, /both_positive\? = call_payload~load_bool\(\);/);
assert.match(poolRoute, /lp_account::add_liquidity\(\s*amount0,\s*amount1,\s*min_lp_out,\s*fwd_amount,\s*both_positive\?,/s);
assert.match(lpAccount, /if both_positive\? \{\s*mint\? = \(min_lp_out > 0\) & \(\(storage::amount0 > 0\) & \(storage::amount1 > 0\)\);\s*\} else \{\s*mint\? = \(min_lp_out > 0\) & \(storage::amount0 \+ storage::amount1 > 0\);/s);
assert.match(lpAccount, /storage::amount0 \+= new_amount0;\s*storage::amount1 \+= new_amount1;/s);
assert.match(poolCallback, /throw_unless\(error::invalid_caller, equal_slices\(lp_account~address\(params::workchain\), ctx\.at\(SENDER\)\)\);/);
assert.match(poolCallback, /\(liquidity < min_lp_out\)\s*\|\s*\(storage::total_supply_lp > math::MAX_COINS\)/s);
assert.match(poolCallback, /storage::reserve0 \+= \(tot_am0 - new_collected_protocol_fees0\);\s*storage::reserve1 \+= \(tot_am1 - new_collected_protocol_fees1\);/s);

function mintGate(amount0, amount1, minLpOut, bothPositive) {
  if (bothPositive) return minLpOut > 0n && amount0 > 0n && amount1 > 0n;
  return minLpOut > 0n && amount0 + amount1 > 0n;
}

assert.equal(mintGate(5n, 7n, 1n, true), true);
assert.equal(mintGate(5n, 0n, 1n, true), false);
assert.equal(mintGate(5n, 0n, 1n, false), true);
assert.equal(mintGate(0n, 0n, 1n, false), false);
assert.equal(mintGate(5n, 7n, 0n, false), false);

function poolCommit(state, amount0, amount1, liquidity, minLpOut) {
  if (liquidity < minLpOut) throw new Error('min_lp_out');
  if (state.totalSupply + liquidity > state.maxCoins) throw new Error('supply_bound');
  return {
    totalSupply: state.totalSupply + liquidity,
    reserve0: state.reserve0 + amount0,
    reserve1: state.reserve1 + amount1,
  };
}

const state = { totalSupply: 100n, reserve0: 1000n, reserve1: 2000n, maxCoins: 2n ** 120n - 1n };
const committed = poolCommit(state, 5n, 0n, 3n, 1n);
assert.deepEqual(committed, { totalSupply: 103n, reserve0: 1005n, reserve1: 2000n });
assert.throws(() => poolCommit(state, 5n, 0n, 0n, 1n), /min_lp_out/);
assert.throws(() => poolCommit({ ...state, totalSupply: state.maxCoins }, 5n, 0n, 1n, 1n), /supply_bound/);

console.log('AD1 mint-gate edge check passed: the user bit selects only the positive-leg gate; pool caller, min-LP, supply, and reserve checks remain authoritative');
