const assert = require('node:assert/strict');
const fs = require('node:fs');

function directAdd(state, requested0, requested1) {
  const amount0 = requested0 || state.amount0;
  const amount1 = requested1 || state.amount1;
  if (!(amount0 > 0n && amount1 > 0n)) throw new Error('zero_output');
  const next = { amount0: state.amount0 - amount0, amount1: state.amount1 - amount1 };
  if (next.amount0 < 0n || next.amount1 < 0n) throw new Error('no_liquidity');
  return next;
}

let state = { amount0: 5n, amount1: 10n };
state = directAdd(state, 2n, 4n);
assert.deepEqual(state, { amount0: 3n, amount1: 6n });
state = directAdd(state, 0n, 0n);
assert.deepEqual(state, { amount0: 0n, amount1: 0n });
assert.throws(() => directAdd(state, 0n, 0n), /zero_output/);

const user = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_account/msgs/user.fc',
  'utf8',
);
const pool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_account.fc',
  'utf8',
);
assert.match(user, /storage::amount0 = 0;\s*storage::amount1 = 0;\s*storage::save\(\);/s);
assert.match(user, /storage::amount0 -= am0;\s*storage::amount1 -= am1;/s);
assert.match(user, /storage::amount0 >= 0/);
assert.match(user, /storage::amount1 >= 0/);
assert.match(pool, /lp_account::add_liquidity\(\s*tot_am0,\s*tot_am1,\s*0,\s*0,\s*true/s);
assert.match(pool, /if ctx.at\(OPCODE\) == op::cb_refund_me/);

console.log('AC3 lifecycle edge check passed: residual direct-add state clears exactly once and refund clears storage');
