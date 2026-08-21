const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const math = read('contracts/pool/pools/constant_product/math.fc');
const pool = read('contracts/pool/pools/constant_product/pool.fc');
const router = read('contracts/pool/msgs/router.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');

const FEE_DIVIDER = 10_000n;
const MAX_COINS = (1n << 120n) - 1n;
const floorDiv = (a, b) => a / b;
const ceilDiv = (a, b) => (a + b - 1n) / b;

assert(math.includes('repeat(7)'));
assert(math.includes('throw_if(math::error::invalid_input, x < 0);'));
assert(math.includes('return (r < r1 ? r : r1);'));
assert(pool.includes('amount_in_with_fee = _amount_in * (params::fee_divider - storage::lp_fee)'));
assert(pool.includes('base_out = muldiv(amount_in_with_fee, _reserve_out, (_reserve_in * params::fee_divider + amount_in_with_fee))'));
assert(lpAccount.includes('storage::reserve0 += tot_am0'));
assert(router.includes('throw_arg_if(op::swap_refund_0_out, 1, out < 1)'));
assert(router.includes('throw_arg_if(op::swap_refund_reserve_err, 1'));
const reserveMutation = router.indexOf('storage::reserve0 += amount0');
const checks = router.indexOf('throw_arg_if(op::swap_refund_0_out', reserveMutation);
const save = router.indexOf('storage::save()', checks);
assert(reserveMutation > 0 && checks > reserveMutation && save > checks);

function exactSqrt(x) {
  if (x <= 1n) return x;
  let r = 1n << BigInt((x.toString(2).length + 1) >> 1);
  while (true) {
    const next = (r + x / r) >> 1n;
    if (next >= r) return r;
    r = next;
  }
}

function ozSqrt(x) {
  if (x <= 1n) return x;
  let xx = x;
  let r = 1n;
  if (xx >= 0x100000000000000000000000000000000n) { xx >>= 128n; r <<= 64n; }
  if (xx >= 0x10000000000000000n) { xx >>= 64n; r <<= 32n; }
  if (xx >= 0x100000000n) { xx >>= 32n; r <<= 16n; }
  if (xx >= 0x10000n) { xx >>= 16n; r <<= 8n; }
  if (xx >= 0x100n) { xx >>= 8n; r <<= 4n; }
  if (xx >= 0x10n) { xx >>= 4n; r <<= 2n; }
  if (xx >= 0x4n) r <<= 1n;
  r = (3n * r) >> 1n;
  for (let i = 0; i < 7; i += 1) r = (r + x / r) >> 1n;
  const r1 = x / r;
  return r < r1 ? r : r1;
}

const sqrtInputs = [];
for (let i = 0n; i <= 4096n; i += 1n) sqrtInputs.push(i);
for (const bit of [4n, 8n, 16n, 32n, 64n, 120n, 128n, 240n]) {
  for (const delta of [-1n, 0n, 1n]) {
    const value = 1n << bit;
    if (value + delta >= 0n) sqrtInputs.push(value + delta);
  }
}
for (const [left, right] of [[1n, MAX_COINS], [MAX_COINS, 1n], [MAX_COINS, MAX_COINS], [MAX_COINS / 3n, MAX_COINS / 997n]]) {
  sqrtInputs.push(left * right);
}
let seed = 0x123456789abcdefn;
const mask = (1n << 120n) - 1n;
for (let i = 0; i < 256; i += 1) {
  seed = (seed * 6364136223846793005n + 1442695040888963407n) & mask;
  sqrtInputs.push(seed * ((seed >> 7n) | 1n));
}
let sqrtCases = 0;
for (const input of sqrtInputs) {
  const expected = exactSqrt(input);
  const actual = ozSqrt(input);
  assert.equal(actual, expected, `sqrt drift for ${input}`);
  assert(actual * actual <= input && (actual + 1n) * (actual + 1n) > input);
  sqrtCases += 1;
}

function swapModel(reserveIn, reserveOut, amountIn, lpFee, protocolFee, refFee) {
  const amountInWithFee = amountIn * (FEE_DIVIDER - lpFee);
  const denominator = reserveIn * FEE_DIVIDER + amountInWithFee;
  const baseOut = floorDiv(amountInWithFee * reserveOut, denominator);
  const protocolOut = protocolFee > 0n ? ceilDiv(baseOut * protocolFee, FEE_DIVIDER) : 0n;
  const refOut = refFee > 0n ? ceilDiv(baseOut * refFee, FEE_DIVIDER) : 0n;
  const out = baseOut - protocolOut - refOut;
  return { baseOut, protocolOut, refOut, out };
}

const swapReserves = [
  [1n, 1n], [1n, MAX_COINS], [MAX_COINS, 1n],
  [1_000_000n, 2_000_000n], [MAX_COINS / 3n, MAX_COINS / 997n],
];
const swapAmounts = [1n, 2n, 999n, 1_000_000n, MAX_COINS];
let swapCases = 0;
let successfulCases = 0;
let refundCases = 0;
for (const [reserveIn, reserveOut] of swapReserves) {
  for (const amountIn of swapAmounts) {
    for (const lpFee of [0n, 10n, 100n]) {
      const result = swapModel(reserveIn, reserveOut, amountIn, lpFee, 100n, 100n);
      assert(result.out <= result.baseOut);
      if (result.out < 1n) {
        refundCases += 1;
      } else {
        const postIn = reserveIn + amountIn;
        const postOut = reserveOut - result.baseOut;
        assert(postOut > 0n);
        assert(postIn * postOut >= reserveIn * reserveOut, 'successful output reduced k');
        successfulCases += 1;
      }
      swapCases += 1;
    }
  }
}

console.log(JSON.stringify({
  sqrt_cases: sqrtCases,
  sqrt_drift_cases: 0,
  swap_cases: swapCases,
  successful_conservation_cases: successfulCases,
  small_output_refund_cases: refundCases,
  reserve_mutation_before_checks: true,
  success_only_save_after_checks: true,
  result: 'PASS',
}, null, 2));
