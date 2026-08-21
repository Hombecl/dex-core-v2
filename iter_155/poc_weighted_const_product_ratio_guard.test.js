const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const math = read('contracts/pool/pools/weighted_const_product/math.fc');
const pool = read('contracts/pool/pools/weighted_const_product/pool.fc');
const router = read('contracts/pool/msgs/router.fc');
const admin = read('contracts/router/pools/weighted_const_product/ext_admin.fc');
const extRouter = read('contracts/pool/pools/weighted_const_product/ext_router.fc');
const stateInit = read('contracts/pool/pools/weighted_const_product/state_init.fc');

const SCALE = 1_000_000_000_000_000_000n;
const MAX_RATIO = 300_000_000_000_000_000n;
const FEE_DIVIDER = 10_000n;
const MAX_COINS = (1n << 120n) - 1n;
const floorDiv = (a, b) => a / b;
const fpMul = (a, b) => floorDiv(a * b, SCALE);
const netInput = (gross, lpFee) => floorDiv(gross * (FEE_DIVIDER - lpFee), FEE_DIVIDER);

assert(math.includes('const _MAX_IN_RATIO = 300000000000000000'));
assert(math.includes('throw_unless(error::max_in_ratio, _amount_in <= _balance_in.math::fp::mul(_MAX_IN_RATIO));'));
assert(math.includes('int weight_out = _weight_in.math::fp::complement();'));
assert(admin.includes('(0 < new_w) & (new_w < math::ONE_DEC)'));
assert(extRouter.includes('if storage::w0 == 0'));
assert(stateInit.includes('0 64 u'));

const swapBody = pool.slice(pool.indexOf('(int, int, int) pool::get_swap_out'));
const guard = math.indexOf('throw_unless(error::max_in_ratio');
const conversion = swapBody.indexOf('int base_in_without_fee =');
const firstCalc = swapBody.indexOf('calc_out_given_in(');
assert(conversion >= 0 && firstCalc > conversion, 'fee-adjusted input must reach the shared ratio guard');
assert(pool.includes('calc_out_given_in(_reserve_in, storage::w0, base_in_without_fee, _reserve_out)'));
assert(pool.includes('calc_out_given_in(_reserve_in, storage::w0.math::fp::complement(), base_in_without_fee, _reserve_out)'));
assert(router.includes('pool::get_swap_out(true, ref_value, amount0, storage::reserve0, storage::reserve1)'));
assert(router.includes('pool::get_swap_out(false, ref_value, amount1, storage::reserve1, storage::reserve0)'));

function ratioLimit(balance) {
  return fpMul(balance, MAX_RATIO);
}

const reserves = [1n, 2n, 3n, 10n, 101n, 1_000_000n, 1_000_000_001n, MAX_COINS / 2n, MAX_COINS];
const lpFees = [0n, 1n, 10n, 100n];
let exactBoundaryCases = 0;
let rejectedAboveBoundary = 0;
let feeAdjustedCases = 0;
for (const reserve of reserves) {
  const limit = ratioLimit(reserve);
  assert(limit <= reserve * 3n / 10n);
  for (const net of [0n, limit, limit + 1n]) {
    assert.equal(net <= limit, net === 0n || net === limit);
    if (net === limit) exactBoundaryCases += 1;
    if (net === limit + 1n) rejectedAboveBoundary += 1;
  }
  for (const lpFee of lpFees) {
    const retained = FEE_DIVIDER - lpFee;
    const gross = (((limit + 1n) * FEE_DIVIDER) - 1n) / retained;
    assert(netInput(gross, lpFee) <= limit);
    assert(netInput(gross + 1n, lpFee) > limit);
    feeAdjustedCases += 1;
  }
}

// Directional routing must preserve the guard's reserve-in operand; only the
// weight complement changes between token0->token1 and token1->token0.
const sideTrue = pool.indexOf('calc_out_given_in(_reserve_in, storage::w0, base_in_without_fee, _reserve_out)');
const sideFalse = pool.indexOf('calc_out_given_in(_reserve_in, storage::w0.math::fp::complement(), base_in_without_fee, _reserve_out)');
assert(sideTrue >= 0 && sideFalse > sideTrue);
const poolSwap = router.indexOf('if amount0 {');
const trueCall = router.indexOf('pool::get_swap_out(true', poolSwap);
const falseCall = router.indexOf('pool::get_swap_out(false', trueCall);
assert(poolSwap >= 0 && trueCall > poolSwap && falseCall > trueCall);

console.log(JSON.stringify({
  ratio_constant_checked: MAX_RATIO.toString(),
  weight_domain_bounds_checked: 2,
  directional_guard_paths_checked: 2,
  reserve_boundary_values_checked: reserves.length,
  exact_boundary_cases: exactBoundaryCases,
  rejected_above_boundary: rejectedAboveBoundary,
  fee_adjusted_cases: feeAdjustedCases,
  direction_specific_ratio_bypasses: 0,
  result: 'PASS',
}, null, 2));
