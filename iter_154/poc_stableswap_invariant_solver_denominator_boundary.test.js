const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const math = read('contracts/pool/pools/stableswap/math.fc');
const pool = read('contracts/pool/pools/stableswap/pool.fc');
const router = read('contracts/pool/msgs/router.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const admin = read('contracts/router/pools/stableswap/ext_admin.fc');
const stateInit = read('contracts/pool/pools/stableswap/state_init.fc');

const MAX_COINS = (1n << 120n) - 1n;
const floorDiv = (a, b) => a / b;
const ceilDiv = (a, b) => (a + b - 1n) / b;
const abs = (a) => (a < 0n ? -a : a);

assert(math.includes('/ (left_balance * 2)'));
assert(math.includes('/ (right_balance * 2)'));
assert(math.includes('amplification_parameter * p_d'));
assert(math.includes('invariant / amplification_parameter'));
assert(math.includes('const _MAX_ITERATIONS = 255'));
assert(math.includes('throw(error::not_converge)'));
assert(admin.includes('const _MIN_AMP = 1'));
assert(admin.includes('const _MAX_AMP = 2000'));
assert(stateInit.includes('.store_uint(1, 32)'));

// Reachability guards for the raw math divisions.
const initialGuard = lpAccount.indexOf('throw_unless(error::low_liquidity, (tot_am0 > 0) & (tot_am1 > 0));');
const initialMath = lpAccount.indexOf('liquidity = pool::get_lp_provide_init_out(tot_am0, tot_am1);');
assert(initialGuard >= 0 && initialMath > initialGuard, 'initial invariant must follow both-leg positivity gate');
assert(router.includes('storage::reserve1 <= 0'));
assert(router.includes('storage::reserve0 <= 0'));

function calculateInvariant(amp, left, right) {
  assert(amp >= 1n && amp <= 2000n);
  assert(left > 0n && right > 0n);
  const sum = left + right;
  let invariant = sum;
  for (let i = 0; i < 255; i += 1) {
    let dp = invariant;
    dp = floorDiv(dp * invariant, left * 2n);
    dp = floorDiv(dp * invariant, right * 2n);
    const previous = invariant;
    const first = amp * sum + dp * 2n;
    const second = (amp - 1n) * invariant + dp * 3n;
    assert(second > 0n, 'invariant update denominator must stay positive');
    invariant = floorDiv(first * invariant, second);
    if (abs(invariant - previous) <= 1n) return { converged: true, invariant, iterations: i + 1 };
  }
  return { converged: false, invariant: null, iterations: 255 };
}

function getOutBalance(amp, left, right, invariant, side) {
  let sum = left;
  let pd = left * 2n;
  pd = floorDiv(pd * right * 2n, invariant);
  assert(pd > 0n, 'p_d denominator path must remain positive');
  sum += right;
  sum -= side ? right : left;
  const c = ceilDiv(invariant * invariant, amp * pd) * (side ? right : left);
  const b = sum + floorDiv(invariant, amp);
  let tokenBalance = ceilDiv(invariant * invariant + c, invariant + b);
  assert(invariant + b > 0n);
  for (let i = 0; i < 255; i += 1) {
    const previous = tokenBalance;
    const denominator = tokenBalance * 2n + b - invariant;
    assert(denominator > 0n, 'output solver denominator reached zero/non-positive');
    tokenBalance = ceilDiv(tokenBalance * tokenBalance + c, denominator);
    if (abs(tokenBalance - previous) <= 1n) return { converged: true, tokenBalance, iterations: i + 1 };
  }
  return { converged: false, tokenBalance: null, iterations: 255 };
}

const reserveSamples = [
  [1n, 1n],
  [1n, MAX_COINS],
  [MAX_COINS, 1n],
  [2n, MAX_COINS - 1n],
  [MAX_COINS / 2n, MAX_COINS],
  [1_000_000n, 1_000_000_000_000_000_000n],
  [MAX_COINS / 997n, MAX_COINS / 3n],
];
const ampSamples = [1n, 2n, 100n, 1000n, 2000n];
let invariantCases = 0;
let outputCases = 0;
let failClosedInvariantCases = 0;
let failClosedOutputCases = 0;
let maxInvariantIterations = 0;
let maxOutputIterations = 0;
for (const amp of ampSamples) {
  for (const [left, right] of reserveSamples) {
    const invariantResult = calculateInvariant(amp, left, right);
    if (!invariantResult.converged) {
      failClosedInvariantCases += 1;
      continue;
    }
    const { invariant, iterations } = invariantResult;
    assert(invariant > 0n);
    maxInvariantIterations = Math.max(maxInvariantIterations, iterations);
    invariantCases += 1;
    for (const side of [false, true]) {
      const leftAfterInput = side ? left + 1n : left;
      const rightAfterInput = side ? right : right + 1n;
      const out = getOutBalance(amp, leftAfterInput, rightAfterInput, invariant, side);
      if (!out.converged) {
        failClosedOutputCases += 1;
        continue;
      }
      assert(out.tokenBalance >= 0n);
      maxOutputIterations = Math.max(maxOutputIterations, out.iterations);
      outputCases += 1;
    }
  }
}

// The production ordering computes all solver output before reserve mutation,
// then validates reserve positivity before the only save in the swap branch.
const swapCall = router.indexOf('(out1, protocol_fee_out, ref_fee_out1) = pool::get_swap_out');
const reserveMutation = router.indexOf('storage::reserve0 += amount0', swapCall);
const reserveCheck = router.indexOf('throw_arg_if(op::swap_refund_reserve_err', reserveMutation);
const save = router.indexOf('storage::save()', reserveCheck);
assert(swapCall >= 0 && reserveMutation > swapCall && reserveCheck > reserveMutation && save > reserveCheck);
const swapPoolBody = pool.slice(pool.indexOf('(int, int, int) pool::get_swap_out'));
assert(swapPoolBody.indexOf('calc_out_given_in(') >= 0);
assert(swapPoolBody.indexOf('calculate_invariant(') > swapPoolBody.indexOf('calc_out_given_in('));
const lpProvideTry = lpAccount.indexOf('try { ;; catch math errors');
const lpProvideCall = lpAccount.indexOf('(liquidity, new_collected_protocol_fees0, new_collected_protocol_fees1) = pool::get_lp_provide_out', lpProvideTry);
const lpSave = lpAccount.indexOf('storage::save()', lpProvideCall);
assert(lpProvideTry >= 0 && lpProvideCall > lpProvideTry && lpSave > lpProvideCall, 'LP provide math must be inside catchable path before success-only save');

console.log(JSON.stringify({
  raw_division_sites_checked: 4,
  reachability_guards_checked: 5,
  amp_boundary_values_checked: ampSamples.length,
  reserve_ratio_boundary_pairs_checked: reserveSamples.length,
  invariant_cases: invariantCases,
  output_solver_cases: outputCases,
  max_invariant_iterations: maxInvariantIterations,
  max_output_iterations: maxOutputIterations,
  fail_closed_invariant_cases: failClosedInvariantCases,
  fail_closed_output_cases: failClosedOutputCases,
  non_positive_denominators: 0,
  under_converged_outputs: 0,
  result: 'PASS',
}, null, 2));
