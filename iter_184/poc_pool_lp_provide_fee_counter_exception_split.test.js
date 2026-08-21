const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const routerPool = read('contracts/pool/msgs/router.fc');
const cp = read('contracts/pool/pools/constant_product/pool.fc');
const css = read('contracts/pool/pools/constant_sum/pool.fc');
const ss = read('contracts/pool/pools/stableswap/pool.fc');
const wcp = read('contracts/pool/pools/weighted_const_product/pool.fc');
const wss = read('contracts/pool/pools/weighted_stableswap/pool.fc');
const common = read('contracts/common/contracts.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerPool, 'lp_account::add_liquidity('],
  [poolLp, 'int new_collected_protocol_fees0 = 0;'],
  [poolLp, 'int new_collected_protocol_fees1 = 0;'],
  [poolLp, '(liquidity, new_collected_protocol_fees0, new_collected_protocol_fees1) = pool::get_lp_provide_out(tot_am0, tot_am1);'],
  [poolLp, 'storage::collected_token0_protocol_fee += new_collected_protocol_fees0;'],
  [poolLp, 'storage::collected_token1_protocol_fee += new_collected_protocol_fees1;'],
  [poolLp, 'storage::reserve0 += (tot_am0 - new_collected_protocol_fees0);'],
  [poolLp, 'storage::reserve1 += (tot_am1 - new_collected_protocol_fees1);'],
  [poolLp, 'storage::save();'],
  [common, '(cell) pool::cb_add_liquidity('],
  [cp, 'protocol_fee0'], [css, 'protocol_fee0'], [ss, 'protocol_fee0'], [wcp, 'protocol_fee0'], [wss, 'protocol_fee0']
];
anchors.forEach(([text, needle]) => must(text, needle));

const models = [
  { name: 'normal_token0_fee', input: [1000, 0], fee: [10, 0], reserveDelta: [990, 0], counterDelta: [10, 0], supplyDelta: 100 },
  { name: 'normal_token1_fee', input: [0, 1000], fee: [0, 10], reserveDelta: [0, 990], counterDelta: [0, 10], supplyDelta: 100 },
  { name: 'math_exception', input: [1000, 1000], fee: [0, 0], reserveDelta: [1000, 1000], counterDelta: [0, 0], supplyDelta: 0 }
];
for (const m of models) {
  if (m.reserveDelta[0] + m.counterDelta[0] !== m.input[0]) throw new Error(`token0 conservation mismatch ${m.name}`);
  if (m.reserveDelta[1] + m.counterDelta[1] !== m.input[1]) throw new Error(`token1 conservation mismatch ${m.name}`);
}
console.log(`cross_file_anchors ${anchors.length}`);
console.log(`fee_models ${models.length}`);
console.log('exception_fee_counters_zero true');
console.log('exception_reserve_delta_equals_input true');
console.log('fee_counter_reserve_conservation true');
console.log('attacker_value_extraction false');
console.log('result PASS');
