const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const math = read('contracts/pool/pools/weighted_stableswap/math.fc');
const pool = read('contracts/pool/pools/weighted_stableswap/pool.fc');
const router = read('contracts/pool/msgs/router.fc');

assert(math.includes('const int __EPSILON = 1000000000000000000000000'));
assert(math.includes('const int __MAX_ITERATIONS = 255'));
for (const fn of ['solve_dx', 'solve_dy']) {
  const start = math.indexOf(`(int) ${fn}`);
  const end = math.indexOf('\n}', start) + 2;
  const body = math.slice(start, end);
  assert(body.includes('throw_if(error::df_zero, df_d == 0)'), `${fn}: derivative guard missing`);
  assert(body.includes('throw_if(error::not_converge, i > __MAX_ITERATIONS)'), `${fn}: iteration guard missing`);
  assert(body.includes('until(abs(delta_f) <= __EPSILON)'), `${fn}: epsilon guard missing`);
}
assert(pool.includes('base_out = solve_dy(_reserve_in, _reserve_out, base_in_without_fee)'));
assert(pool.includes('base_out = solve_dx(_reserve_out, _reserve_in, base_in_without_fee)'));

const getSwap = router.indexOf('(out1, protocol_fee_out, ref_fee_out1) = pool::get_swap_out');
const firstMutation = router.indexOf('storage::reserve0 += amount0', getSwap);
assert(getSwap >= 0 && firstMutation > getSwap, 'solver must precede reserve mutation');
const check = router.indexOf('throw_arg_if(op::swap_refund_0_out', firstMutation);
const save = router.indexOf('storage::save()', check);
assert(check > firstMutation && save > check, 'post-solver checks must precede save');

// Approximate the fixed-point solver shape for positive weighted-stableswap samples.
const amp = 1000;
const rate = 1;
const p = 0.5;
const q = 0.5;
const epsilon = 1e-3;
const invariant = (x, y) => amp * (x + rate * y) + Math.pow(x, p) * Math.pow(rate * y, q);
const dxDerivative = (x, y) => amp + p * Math.pow(x, p - 1) * Math.pow(rate, q) * Math.pow(y, q);
const dyDerivative = (x, y) => amp * rate + q * Math.pow(y, q - 1) * Math.pow(rate, q) * Math.pow(x, p);
function solveDx(x, y, dy) {
  const k = invariant(x, y);
  let start = x;
  let iterations = 0;
  let residual = Infinity;
  do {
    residual = invariant(start, y + dy) - k;
    const d = dxDerivative(start, y + dy);
    assert(d !== 0);
    start -= residual / d;
    iterations += 1;
    assert(iterations <= 255);
  } while (Math.abs(residual) > epsilon);
  return { out: x - start, residual: Math.abs(residual), iterations };
}
function solveDy(x, y, dx) {
  const k = invariant(x, y);
  let start = y;
  let iterations = 0;
  let residual = Infinity;
  do {
    residual = invariant(x + dx, start) - k;
    const d = dyDerivative(x + dx, start);
    assert(d !== 0);
    start -= residual / d;
    iterations += 1;
    assert(iterations <= 255);
  } while (Math.abs(residual) > epsilon);
  return { out: y - start, residual: Math.abs(residual), iterations };
}
const samples = [
  [1_000_000, 2_000_000, 1_000],
  [10_000_000, 8_000_000, 25_000],
  [100_000_000, 120_000_000, 500_000],
  [1_000_000_000, 700_000_000, 2_000_000],
];
let maxIterations = 0;
for (const [x, y, delta] of samples) {
  const a = solveDx(x, y, delta);
  const b = solveDy(x, y, delta);
  assert(a.out > 0 && b.out > 0);
  assert(a.residual <= epsilon && b.residual <= epsilon);
  maxIterations = Math.max(maxIterations, a.iterations, b.iterations);
}

console.log(JSON.stringify({
  solver_functions_checked: 2,
  guard_layers_checked: 3,
  mutation_order_checks: 3,
  positive_samples_checked: samples.length,
  max_approx_iterations: maxIterations,
  under_converged_positive_outputs: 0,
  result: 'PASS',
}, null, 2));
