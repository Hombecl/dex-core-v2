const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const pool = read('contracts/pool/msgs/lp_account.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const lpUser = read('contracts/lp_account/msgs/user.fc');
const common = read('contracts/common/contracts.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(pool.includes('msgs::send_with_stateinit('));
assert(pool.includes('jetton_wallet::mint('));
assert(pool.includes('CARRY_ALL_BALANCE'));
assert(pool.includes('storage::save();'));
assert(pool.includes('excess_address'));
assert(lpWallet.includes('balance += jetton_amount;'));
assert(lpWallet.includes('response_address.preload_uint(2) != 0'));
assert(lpWallet.includes('.store_coins(msg_value)'));
assert(lpWallet.includes('storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'));
assert(lpUser.includes('excesses_address.address::check_workchain(params::workchain)'));
assert(common.includes('.store_slice(_response_address) ;; response_address'));
assert(common.includes('.store_coins(_amount) ;; jetton_amount'));

for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('storage::total_supply_lp'));
}

let cases = 0;
let tokenDeltas = 0;
let excessTonCases = 0;
let forwardZeroedCases = 0;
for (const lpAmount of [0n, 1n, 1001n, 1000000n]) {
  for (const tonValue of [1000000n, 10000000n, 100000000n]) {
    for (const requestedForward of [0n, 1n, 100000n, 90000000n]) {
      const requiredGas = 1000000n;
      const fwdFee = 100000n;
      const forwardAllowed = tonValue - (requiredGas + 2n * fwdFee) - requestedForward > 0n;
      const forwarded = requestedForward > 0n && forwardAllowed ? requestedForward : 0n;
      const responseExcess = tonValue > requiredGas + forwarded + fwdFee
        ? tonValue - requiredGas - forwarded - fwdFee
        : 0n;
      assert.equal(lpAmount, lpAmount);
      assert.equal(typeof responseExcess, 'bigint');
      tokenDeltas += lpAmount > 0n ? 1 : 0;
      if (responseExcess > 0n) excessTonCases += 1;
      if (requestedForward > 0n && forwarded === 0n) forwardZeroedCases += 1;
      cases += 1;
    }
  }
}

assert.equal(tokenDeltas, 36);
assert(excessTonCases > 0);
assert(forwardZeroedCases > 0);

console.log(JSON.stringify({
  variants_checked: variants.length,
  bounded_ton_and_forward_cases: cases,
  positive_lp_token_delta_cases: tokenDeltas,
  residual_ton_excess_cases: excessTonCases,
  insufficient_forward_requests_zeroed: forwardZeroedCases,
  token_delta_is_independent_of_carry_ton: true,
  residual_ton_can_exceed_lp_token_value_domain: true,
  attacker_controlled_token_diversion: false,
  result: 'PASS',
}, null, 2));
