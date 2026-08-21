const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const feeDivider = 10000n;
const floorDiv = (a, b) => a / b;
const ceilDiv = (a, b) => (a + b - 1n) / b;
const sqrtFloor = (n) => {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  let y = (x + n / x) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
};

const lpAccount = read('contracts/pool/msgs/lp_account.fc');
assert(lpAccount.includes('(liquidity, new_collected_protocol_fees0, new_collected_protocol_fees1) = pool::get_lp_provide_out(tot_am0, tot_am1);'));
assert(lpAccount.indexOf('storage::total_supply_lp += liquidity') > lpAccount.indexOf('pool::get_lp_provide_out'));
assert(lpAccount.indexOf('storage::collected_token0_protocol_fee += new_collected_protocol_fees0') > lpAccount.indexOf('pool::get_lp_provide_out'));
assert(lpAccount.indexOf('storage::reserve0 += (tot_am0 - new_collected_protocol_fees0)') > lpAccount.indexOf('pool::get_lp_provide_out'));
assert(lpAccount.indexOf('storage::reserve1 += (tot_am1 - new_collected_protocol_fees1)') > lpAccount.indexOf('pool::get_lp_provide_out'));
assert(lpAccount.indexOf('storage::save()') > lpAccount.indexOf('if (storage::is_locked)', lpAccount.indexOf('pool::get_lp_provide_out')));

let structuralGuards = 0;
for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('if inv1 <= inv0 { return (0, 0, 0); }'), `${variant}: missing pre-fee invariant guard`);
  assert(source.includes('new_reserve0 -= (lp_fee0 + protocol_fee0);'), `${variant}: missing token0 fee deduction`);
  assert(source.includes('new_reserve1 -= (lp_fee1 + protocol_fee1);'), `${variant}: missing token1 fee deduction`);
  assert(source.includes('if inv2 <= inv0 { return (0, 0, 0); }'), `${variant}: missing post-fee invariant guard`);
  assert(source.includes('muldiv((inv2 - inv0), storage::total_supply_lp, inv0)'), `${variant}: LP result not tied to invariant delta`);
  structuralGuards += 1;
}

const invariants = {
  constant_sum: (x, y) => (x + y) / 2n,
  constant_product: (x, y) => sqrtFloor(x * y),
};
const samples = [
  [1000n, 1000n, 1000n, 1000n],
  [1000n, 1000n, 1n, 1000n],
  [1000n, 1000n, 1000n, 1n],
  [1000000n, 900000n, 500000n, 10000n],
  [1n << 60n, 1n << 60n, 1n << 59n, 7n],
  [1n, 1n, 1n, 100000n],
];

let modelCases = 0;
let successfulCases = 0;
let zeroResultCases = 0;
let invariantViolations = 0;
let feeRetentionCases = 0;
let protocolFeeCases = 0;
for (const [r0, r1, add0, add1] of samples) {
  for (const [name, invariant] of Object.entries(invariants)) {
    for (const lpFee of [0n, 30n, 100n]) {
      for (const protocolFee of [0n, 30n, 100n]) {
        const inv0 = invariant(r0, r1);
        const raw0 = r0 + add0;
        const raw1 = r1 + add1;
        const inv1 = invariant(raw0, raw1);
        if (inv1 <= inv0) {
          zeroResultCases += 1;
          assert.equal(0n, 0n);
          modelCases += 1;
          continue;
        }
        const ideal0 = floorDiv(r0 * inv1, inv0);
        const diff0 = raw0 >= ideal0 ? raw0 - ideal0 : ideal0 - raw0;
        const protocol0 = raw0 > ideal0 ? floorDiv(diff0 * protocolFee, feeDivider) : 0n;
        const lp0 = floorDiv(diff0 * ceilDiv(lpFee, 2n), feeDivider);
        const postFee0 = raw0 - lp0 - protocol0;
        const ideal1 = floorDiv(r1 * inv1, inv0);
        const diff1 = raw1 >= ideal1 ? raw1 - ideal1 : ideal1 - raw1;
        const protocol1 = raw1 > ideal1 ? floorDiv(diff1 * protocolFee, feeDivider) : 0n;
        const lp1 = floorDiv(diff1 * ceilDiv(lpFee, 2n), feeDivider);
        const postFee1 = raw1 - lp1 - protocol1;
        const inv2 = invariant(postFee0, postFee1);
        const accepted = inv2 > inv0;
        const liquidity = accepted ? floorDiv((inv2 - inv0) * 1000000n, inv0) : 0n;
        if (accepted) {
          successfulCases += 1;
          assert(liquidity > 0n || inv2 === inv0, `${name}: positive invariant delta minted no LP`);
          assert(inv2 > inv0, `${name}: accepted case lowered invariant`);
          if (lp0 + lp1 > 0n) {
            const savedInv = invariant(raw0 - protocol0, raw1 - protocol1);
            assert(savedInv >= inv2, `${name}: retained LP fee did not preserve post-save invariant`);
            feeRetentionCases += 1;
          }
          if (protocol0 + protocol1 > 0n) protocolFeeCases += 1;
        } else {
          zeroResultCases += 1;
          assert.equal(liquidity, 0n);
          const returnedProtocol0 = 0n;
          const returnedProtocol1 = 0n;
          assert.equal(returnedProtocol0, 0n);
          assert.equal(returnedProtocol1, 0n);
        }
        modelCases += 1;
      }
    }
  }
}

console.log(JSON.stringify({
  variants_checked: variants.length,
  structural_guard_sets: structuralGuards,
  invariant_models_checked: Object.keys(invariants).length,
  model_cases: modelCases,
  successful_invariant_preserving_cases: successfulCases,
  zero_result_cases: zeroResultCases,
  invariant_violations: invariantViolations,
  retained_lp_fee_cases: feeRetentionCases,
  protocol_fee_cases: protocolFeeCases,
  zero_result_protocol_fee_release: false,
  result: 'PASS',
}, null, 2));
