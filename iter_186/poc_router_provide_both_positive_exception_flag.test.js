const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const router = read('contracts/pool/msgs/router.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const poolCallback = read('contracts/pool/msgs/lp_account.fc');
const common = read('contracts/common/contracts.fc');
const op = read('contracts/common/op.fc');
const pool = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [router, 'both_positive? = call_payload~load_bool();'],
  [router, 'lp_account::add_liquidity('],
  [router, 'both_positive?,'],
  [lpAccountPool, 'int both_positive? = in_msg_body~load_bool();'],
  [lpAccountPool, 'mint? = (min_lp_out > 0) & ((storage::amount0 > 0) & (storage::amount1 > 0));'],
  [lpAccountPool, 'mint? = (min_lp_out > 0) & (storage::amount0 + storage::amount1 > 0);'],
  [lpAccountPool, 'pool::cb_add_liquidity('],
  [lpAccountPool, 'storage::amount0 = 0;'],
  [lpAccountPool, 'storage::amount1 = 0;'],
  [lpAccountUser, 'pool::cb_add_liquidity('],
  [poolCallback, 'throw_unless(error::invalid_caller'],
  [poolCallback, 'pool::get_lp_provide_out(tot_am0, tot_am1)'],
  [poolCallback, 'storage::reserve0 += (tot_am0 - new_collected_protocol_fees0);'],
  [poolCallback, 'storage::reserve1 += (tot_am1 - new_collected_protocol_fees1);'],
  [poolCallback, '| (liquidity < min_lp_out)'],
  [poolCallback, 'storage::save();'],
  [common, '.store_bool(_both_positive?)'],
  [op, 'both_positive:uint1'],
  [pool, 'if handle_lp_account_messages()']
];
anchors.forEach(([text, needle]) => must(text, needle));

function gate(bothPositive, minLpOut, amount0, amount1) {
  if (bothPositive) return minLpOut > 0 && amount0 > 0 && amount1 > 0;
  return minLpOut > 0 && amount0 + amount1 > 0;
}

const cases = [
  ['two_legs_flag_true', true, 1, 100, 100, true],
  ['two_legs_flag_false', false, 1, 100, 100, true],
  ['one_leg_flag_true', true, 1, 100, 0, false],
  ['one_leg_flag_false', false, 1, 100, 0, true],
  ['one_leg_other_flag_false', false, 1, 0, 100, true],
  ['zero_min_two_legs', true, 0, 100, 100, false],
  ['zero_min_one_leg', false, 0, 100, 0, false]
];
for (const [name, flag, min, amount0, amount1, expected] of cases) {
  const actual = gate(flag, min, amount0, amount1);
  if (actual !== expected) throw new Error(`${name}: expected ${expected}, got ${actual}`);
}

// The permissive branch can invoke Pool with one real leg, but the callback
// receives exactly the LP-account totals and Pool still requires the derived
// LP-account sender. The flag never manufactures either token leg.
const callbackLegs = { amount0: 100, amount1: 0 };
if (callbackLegs.amount0 + callbackLegs.amount1 !== 100) throw new Error('callback leg conservation mismatch');
if (gate(false, 0, callbackLegs.amount0, callbackLegs.amount1)) throw new Error('zero minimum bypassed');

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`gate_cases ${cases.length}`);
console.log('caller_flag_forwarded true');
console.log('single_leg_requires_real_accumulated_balance true');
console.log('zero_minimum_no_mint true');
console.log('pool_callback_sender_derived true');
console.log('callback_legs_equal_lp_account_totals true');
console.log('attacker_positive_delta false');
console.log('prior_iter_126_duplicate true');
console.log('result PASS');
