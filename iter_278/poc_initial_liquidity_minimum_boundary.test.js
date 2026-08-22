const assert = require('node:assert/strict');

const REQUIRED_MIN = 1001n;

function isqrt(n) {
  if (n < 0n) throw new Error('invalid_input');
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  let y = (x + n / x) >> 1n;
  while (y < x) { x = y; y = (x + n / x) >> 1n; }
  return x;
}

function initialCallback({ sender, expectedSender, amount0, amount1, minLpOut, locked = false }) {
  if (sender !== expectedSender) return { branch: 'invalid_caller', persisted: null, mint: 0n };
  const invariant = amount0 > 0n && amount1 > 0n ? isqrt(amount0 * amount1) : 0n;
  const effectiveMint = invariant - REQUIRED_MIN;
  const working = { totalSupply: invariant, reserve0: amount0, reserve1: amount1 };
  const reject = locked || effectiveMint < minLpOut || working.totalSupply < 0n || working.reserve0 < 0n || working.reserve1 < 0n;
  if (reject) return { branch: 'fallback_refund_without_pool_save', persisted: null, mint: 0n, working };
  return { branch: 'mint_and_pool_save', persisted: working, mint: effectiveMint };
}

const expectedSender = 'derived_lp_account(pool,user)';
const cases = [
  ['zero side', { sender: expectedSender, expectedSender, amount0: 0n, amount1: 1000000n, minLpOut: 0n }],
  ['below required minimum', { sender: expectedSender, expectedSender, amount0: 1000n, amount1: 1000n, minLpOut: 0n }],
  ['exact locked minimum', { sender: expectedSender, expectedSender, amount0: 1001n, amount1: 1001n, minLpOut: 0n }],
  ['one effective LP', { sender: expectedSender, expectedSender, amount0: 1002n, amount1: 1002n, minLpOut: 1n }],
  ['minimum-output rejection', { sender: expectedSender, expectedSender, amount0: 1002n, amount1: 1002n, minLpOut: 2n }],
  ['forged callback sender', { sender: 'outsider', expectedSender, amount0: 1000000n, amount1: 1000000n, minLpOut: 1n }],
];

const results = cases.map(([label, input]) => [label, initialCallback(input)]);
assert.equal(results[0][1].branch, 'fallback_refund_without_pool_save');
assert.equal(results[1][1].branch, 'fallback_refund_without_pool_save');
assert.equal(results[2][1].branch, 'mint_and_pool_save');
assert.equal(results[2][1].mint, 0n);
assert.equal(results[2][1].persisted.totalSupply, 1001n);
assert.equal(results[3][1].branch, 'mint_and_pool_save');
assert.equal(results[3][1].mint, 1n);
assert.equal(results[4][1].branch, 'fallback_refund_without_pool_save');
assert.equal(results[5][1].branch, 'invalid_caller');
for (const [, result] of results) {
  if (result.branch !== 'mint_and_pool_save') assert.equal(result.persisted, null);
  assert.equal(result.mint >= 0n, true);
}
console.log(`PASS ${cases.length} initial-liquidity boundary cases; failed branches save no Pool state and successful mint is invariant - ${REQUIRED_MIN}`);
