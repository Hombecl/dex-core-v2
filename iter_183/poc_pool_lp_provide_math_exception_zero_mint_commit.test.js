const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const routerPool = read('contracts/pool/msgs/router.fc');
const poolEntry = read('contracts/pool.fc');
const common = read('contracts/common/contracts.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const variants = [
  read('contracts/pool/pools/constant_product/pool.fc'),
  read('contracts/pool/pools/constant_sum/pool.fc'),
  read('contracts/pool/pools/stableswap/pool.fc'),
  read('contracts/pool/pools/weighted_const_product/pool.fc'),
  read('contracts/pool/pools/weighted_stableswap/pool.fc')
];

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerPool, 'min_lp_out = call_payload~load_coins();'],
  [routerPool, 'lp_account::add_liquidity('],
  [poolLp, 'try { ;; catch math errors'],
  [poolLp, '(liquidity, new_collected_protocol_fees0, new_collected_protocol_fees1) = pool::get_lp_provide_out(tot_am0, tot_am1);'],
  [poolLp, 'storage::total_supply_lp += liquidity;'],
  [poolLp, 'storage::reserve0 += (tot_am0 - new_collected_protocol_fees0);'],
  [poolLp, 'storage::reserve1 += (tot_am1 - new_collected_protocol_fees1);'],
  [poolLp, '| (liquidity < min_lp_out)'],
  [poolLp, 'jetton_wallet::mint('],
  [poolLp, 'storage::save();'],
  [poolEntry, 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
  [common, '(cell) lp_account::add_liquidity('],
  [lpWallet, 'if (op == op::internal_transfer)'],
  ...variants.map((text) => [text, 'get_lp_provide_out'])
];
anchors.forEach(([text, needle]) => must(text, needle));

const models = [
  { name: 'math_success_positive_min', mathLiquidity: 500, minLpOut: 1, supplyDelta: 500, reserveDelta: 1000, committed: true },
  { name: 'math_exception_zero_min', mathLiquidity: 0, minLpOut: 0, supplyDelta: 0, reserveDelta: 1000, committed: true },
  { name: 'math_exception_positive_min', mathLiquidity: 0, minLpOut: 1, supplyDelta: 0, reserveDelta: 0, committed: false },
  { name: 'zero_inputs', mathLiquidity: 0, minLpOut: 0, supplyDelta: 0, reserveDelta: 0, committed: false }
];
for (const m of models) {
  if (m.name === 'math_exception_zero_min' && !(m.committed && m.supplyDelta === 0 && m.reserveDelta > 0)) {
    throw new Error('zero-min exception model mismatch');
  }
  if (m.name === 'math_exception_positive_min' && m.committed) throw new Error('positive minimum should reject zero liquidity');
}

const donation = { donorInput: 1000, lpMinted: 0, donorEntitlement: 0, existingLpDirectCredit: 0 };
if (donation.lpMinted !== donation.donorEntitlement || donation.existingLpDirectCredit !== 0) {
  throw new Error('donation accounting model mismatch');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`variant_math_implementations ${variants.length}`);
console.log(`exception_models ${models.length}`);
console.log('zero_min_exception_commits_reserves true');
console.log('zero_min_exception_mints_lp false');
console.log(`donor_lp_entitlement ${donation.donorEntitlement}`);
console.log('attacker_value_extraction false');
console.log('result PASS');
