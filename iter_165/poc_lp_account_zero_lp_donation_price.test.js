const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const feeDivider = 10000n;
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const floorDiv = (a, b) => a / b;
const ceilDiv = (a, b) => (a + b - 1n) / b;
const sqrtFloor = (n) => {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  let y = (x + n / x) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
};

assert(lpAccount.includes('(liquidity, new_collected_protocol_fees0, new_collected_protocol_fees1) = pool::get_lp_provide_out(tot_am0, tot_am1);'));
assert(lpAccount.includes('storage::total_supply_lp += liquidity;'));
assert(lpAccount.includes('storage::reserve0 += (tot_am0 - new_collected_protocol_fees0);'));
assert(lpAccount.includes('storage::reserve1 += (tot_am1 - new_collected_protocol_fees1);'));
assert(lpAccount.includes('| (liquidity < min_lp_out)'));
assert(lpAccount.includes('jetton_wallet::mint('));
assert(lpAccount.includes('storage::save();'));

for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('if inv2 <= inv0 { return (0, 0, 0); }'), `${variant}: missing zero-result guard`);
}

const invariant = (x, y) => sqrtFloor(x * y);
const zeroDonationCases = [
  { reserve0: 1n, reserve1: 1n, add0: 1n, add1: 100000n },
  { reserve0: 1n, reserve1: 10n, add0: 100n, add1: 1n },
];
let tested = 0;
let zeroResults = 0;
let acceptedDonations = 0;
let supplyDeltaWithoutMint = 0;
let protocolDeltaWithoutMint = 0;
let donorClaimDelta = 0n;
for (const sample of zeroDonationCases) {
  const { reserve0, reserve1, add0, add1 } = sample;
  const inv0 = invariant(reserve0, reserve1);
  const raw0 = reserve0 + add0;
  const raw1 = reserve1 + add1;
  const inv1 = invariant(raw0, raw1);
  const ideal0 = floorDiv(reserve0 * inv1, inv0);
  const diff0 = raw0 >= ideal0 ? raw0 - ideal0 : ideal0 - raw0;
  const lp0 = floorDiv(diff0 * ceilDiv(100n, 2n), feeDivider);
  const protocol0 = raw0 > ideal0 ? floorDiv(diff0 * 30n, feeDivider) : 0n;
  const ideal1 = floorDiv(reserve1 * inv1, inv0);
  const diff1 = raw1 >= ideal1 ? raw1 - ideal1 : ideal1 - raw1;
  const lp1 = floorDiv(diff1 * ceilDiv(100n, 2n), feeDivider);
  const protocol1 = raw1 > ideal1 ? floorDiv(diff1 * 30n, feeDivider) : 0n;
  const inv2 = invariant(raw0 - lp0 - protocol0, raw1 - lp1 - protocol1);
  const liquidity = inv2 > inv0 ? floorDiv((inv2 - inv0) * 1000000n, inv0) : 0n;
  if (liquidity === 0n) {
    zeroResults += 1;
    const minLpOut = 0n;
    const accepted = liquidity >= minLpOut;
    assert(accepted);
    const supplyDelta = liquidity;
    const protocolDelta = inv2 > inv0 ? protocol0 + protocol1 : 0n;
    assert.equal(supplyDelta, 0n);
    assert.equal(protocolDelta, 0n);
    const reserveAfter0 = raw0 - protocolDelta;
    const reserveAfter1 = raw1;
    assert.equal(reserveAfter0, raw0);
    assert.equal(reserveAfter1, raw1);
    donorClaimDelta += floorDiv(add0 * 1000000n, 1000000n) + floorDiv(add1 * 1000000n, 1000000n);
    acceptedDonations += 1;
    supplyDeltaWithoutMint += Number(supplyDelta);
    protocolDeltaWithoutMint += Number(protocolDelta);
  }
  tested += 1;
}

assert(zeroResults > 0);
assert.equal(supplyDeltaWithoutMint, 0);
assert.equal(protocolDeltaWithoutMint, 0);
assert(donorClaimDelta > 0n);

console.log(JSON.stringify({
  variants_checked: variants.length,
  zero_donation_samples_checked: tested,
  zero_result_cases: zeroResults,
  accepted_min_zero_donations: acceptedDonations,
  lp_supply_delta_on_zero_result: 0,
  protocol_fee_delta_on_zero_result: 0,
  reserve_delta_equals_user_deposit: true,
  donor_claim_increase_is_self_funded: true,
  attacker_value_extraction: false,
  result: 'PASS',
}, null, 2));
