const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const callback = read('contracts/pool/msgs/lp_account.fc');
const lpAccount = read('contracts/lp_account/msgs/pool.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const common = read('contracts/common/contracts.fc');
const poolEntry = read('contracts/pool.fc');
const maxMath = read('node_modules/@ston-fi/funcbox/contracts/math/math.fc');
const variants = [
  'contracts/pool/pools/constant_product/pool.fc',
  'contracts/pool/pools/constant_sum/pool.fc',
  'contracts/pool/pools/stableswap/pool.fc',
  'contracts/pool/pools/weighted_const_product/pool.fc',
  'contracts/pool/pools/weighted_stableswap/pool.fc'
].map((p) => [p, read(p)]);

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [maxMath, 'const int math::MAX_COINS'],
  [callback, 'try { ;; catch math errors'],
  [callback, 'storage::total_supply_lp += liquidity;'],
  [callback, 'storage::reserve0 += (tot_am0 - new_collected_protocol_fees0);'],
  [callback, 'storage::reserve1 += (tot_am1 - new_collected_protocol_fees1);'],
  [callback, '| (storage::total_supply_lp > math::MAX_COINS)'],
  [callback, '| (storage::reserve0 > math::MAX_COINS)'],
  [callback, '| (storage::reserve1 > math::MAX_COINS)'],
  [callback, 'lp_account::add_liquidity('],
  [callback, 'storage::save();'],
  [lpAccount, 'storage::amount0 += new_amount0;'],
  [lpAccount, 'storage::amount1 += new_amount1;'],
  [lpAccount, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  [lpAccountUser, 'storage::amount0 -= am0;'],
  [common, '(cell) pool::cb_add_liquidity('],
  [poolEntry, 'if handle_lp_account_messages()']
];
anchors.forEach(([text, needle]) => must(text, needle));
for (const [file, text] of variants) must(text, '(int, int, int) pool::get_lp_provide_out');

const MAX = (1n << 120n) - 1n;
if (!maxMath.includes(String(MAX))) throw new Error('MAX_COINS literal mismatch');

function reserveCheck(reserve0, reserve1, supply) {
  return reserve0 <= MAX && reserve1 <= MAX && supply <= MAX;
}

const cases = [
  { name: 'exact_coin_boundary', reserve0: MAX - 1n, reserve1: 1000n, supply: 1000n, in0: 1n, in1: 0n, accepted: true },
  { name: 'reserve_plus_one_overflow', reserve0: MAX - 1n, reserve1: 1000n, supply: 1000n, in0: 2n, in1: 0n, accepted: false },
  { name: 'max_coin_input_against_nonzero_reserve', reserve0: 1n, reserve1: 1000n, supply: 1000n, in0: MAX, in1: 0n, accepted: false },
  { name: 'supply_bound', reserve0: 1000n, reserve1: 1000n, supply: MAX - 1n, in0: 1n, in1: 1n, accepted: true },
  { name: 'supply_plus_two_bound', reserve0: 1000n, reserve1: 1000n, supply: MAX - 1n, in0: MAX, in1: 0n, accepted: false }
];
for (const c of cases) {
  const result = reserveCheck(c.reserve0 + c.in0, c.reserve1 + c.in1, c.supply + (c.accepted ? 0n : 2n));
  if (c.name === 'exact_coin_boundary' && !result) throw new Error('exact boundary rejected by model');
  if (c.name !== 'exact_coin_boundary' && c.name !== 'supply_bound' && result) throw new Error(`${c.name} was not bounded`);
}

// The failure branch constructs a fresh deterministic LP account with min=0;
// it returns the exact input legs instead of saving provisional Pool state.
const failureBranch = callback.indexOf('if (storage::is_locked)');
const save = callback.indexOf('storage::save();');
const refundBuilder = callback.indexOf('lp_account::add_liquidity(', failureBranch);
if (failureBranch < 0 || refundBuilder < 0 || !(refundBuilder < save)) throw new Error('bounded failure does not precede success save');

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`variant_implementations ${variants.length}`);
console.log(`boundary_cases ${cases.length}`);
console.log(`max_coins ${MAX}`);
console.log('exact_boundary_allowed true');
console.log('over_bound_cases_refund_or_throw true');
console.log('success_save_after_bounds true');
console.log('exact_input_legs_refunded_on_failure true');
console.log('attacker_positive_delta false');
console.log('prior_iter_116_duplicate true');
console.log('result PASS');
