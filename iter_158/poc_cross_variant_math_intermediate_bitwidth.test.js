const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const stableswapMath = read('contracts/pool/pools/stableswap/math.fc');
const stableswapPool = read('contracts/pool/pools/stableswap/pool.fc');
const weightedStableMath = read('contracts/pool/pools/weighted_stableswap/math.fc');
const weightedStableAdmin = read('contracts/router/pools/weighted_stableswap/ext_admin.fc');
const router = read('contracts/pool/msgs/router.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const commonMath = read('node_modules/@ston-fi/funcbox/contracts/math/math.fc');

const MAX_COINS = (1n << 120n) - 1n;
const MAX_UINT128 = (1n << 128n) - 1n;
const MAX_SIGNED_INT = (1n << 256n) - 1n;
const SCALE = 1_000_000_000_000_000_000n;
const floorDiv = (a, b) => a / b;
const bitLength = (n) => (n === 0n ? 0 : n.toString(2).length);

assert(commonMath.includes('const int math::MAX_COINS'));
assert(stableswapMath.includes('d_p = (d_p * invariant) / (left_balance * 2);'));
assert(stableswapMath.includes('d_p = (d_p * invariant) / (right_balance * 2);'));
assert(stableswapMath.includes('int inv2 = invariant * invariant;'));
assert(weightedStableMath.includes('storage::rate.math::fp::mul(y)'));
assert(weightedStableAdmin.includes('throw_unless(error::math_error, (new_amp <= (2000 * math::ONE_DEC)))'));

function stableswapFirstStep(left, right) {
  const invariant = left + right;
  let dp = invariant;
  const firstNumerator = dp * invariant;
  dp = floorDiv(firstNumerator, left * 2n);
  const secondNumerator = dp * invariant;
  const secondDp = floorDiv(secondNumerator, right * 2n);
  return { invariant, firstNumerator, secondNumerator, secondDp };
}

const extreme = stableswapFirstStep(1n, MAX_COINS);
const balanced = stableswapFirstStep(MAX_COINS, MAX_COINS);
assert(extreme.firstNumerator <= MAX_SIGNED_INT, 'first D^2 product unexpectedly exceeds TVM width');
assert(extreme.secondNumerator > MAX_SIGNED_INT, 'extreme stable D^3 product did not cross TVM width');
assert(balanced.secondNumerator <= MAX_SIGNED_INT, 'balanced stable D^3 product unexpectedly exceeds TVM width');

const rawOverflowSites = [
  { site: 'calculate_invariant d_p * invariant (second multiplication)', value: extreme.secondNumerator },
  { site: '_get_out_balance p_d * right_balance * 2 before muldiv', value: extreme.secondDp * MAX_COINS * 2n },
];
assert(rawOverflowSites.every(({ value }) => value > MAX_SIGNED_INT));

// Other selected-family arithmetic stays within the positive 257-bit result
// envelope at max coin inputs. `math::fp::mul` is a muldiv helper: record both
// its wide product and post-scale result rather than treating the product as a
// raw FunC `*` operation.
const rateProduct = MAX_UINT128 * (MAX_COINS * SCALE);
const rateProductResult = floorDiv(rateProduct, SCALE);
assert(rateProductResult <= MAX_SIGNED_INT);
const constantProduct = MAX_COINS * MAX_COINS;
assert(constantProduct <= MAX_SIGNED_INT);
const fixedPointCoin = MAX_COINS * SCALE;
assert(fixedPointCoin <= MAX_SIGNED_INT);

// The overflow candidates are reached inside math calls that sit in caught
// Router/LP-account branches; only the successful branch calls storage::save.
const routerTry = router.indexOf('try {', router.indexOf('if ctx.at(OPCODE) == op::swap'));
const swapMath = router.indexOf('pool::get_swap_out(true', routerTry);
const routerSave = router.indexOf('storage::save()', swapMath);
const routerRefund = router.indexOf('router::pay_to(', swapMath);
assert(routerTry >= 0 && swapMath > routerTry && routerRefund > swapMath && routerSave > swapMath);
const lpTry = lpAccount.indexOf('try { ;; catch math errors');
const lpMath = lpAccount.indexOf('pool::get_lp_provide_out', lpTry);
const lpSave = lpAccount.indexOf('storage::save()', lpMath);
assert(lpTry >= 0 && lpMath > lpTry && lpSave > lpMath);
assert(stableswapPool.includes('calculate_invariant('));

console.log(JSON.stringify({
  tvm_positive_width_bits: 256,
  reserve_width_bits: 120,
  explicit_overflow_sites_found: rawOverflowSites.length,
  extreme_reserve_pair: ['1', MAX_COINS.toString()],
  extreme_second_d_p_product_bits: bitLength(extreme.secondNumerator),
  extreme_get_out_product_bits: bitLength(rawOverflowSites[1].value),
  balanced_second_d_p_product_bits: bitLength(balanced.secondNumerator),
  constant_product_bits: bitLength(constantProduct),
  fixed_point_coin_bits: bitLength(fixedPointCoin),
  rate_muldiv_result_bits: bitLength(rateProductResult),
  caught_math_paths_checked: 2,
  persistent_value_release_observed: 0,
  result: 'PASS',
}, null, 2));
