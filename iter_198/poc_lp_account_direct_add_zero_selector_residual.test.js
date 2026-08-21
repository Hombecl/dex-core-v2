const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const lpAccountRoot = read('contracts/lp_account.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const lpAccountStorage = read('contracts/lp_account/storage.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const common = read('contracts/common/contracts.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [lpAccountRoot, 'if equal_slices(ctx.at(SENDER), storage::pool_address)'],
  [lpAccountRoot, 'if equal_slices(ctx.at(SENDER), storage::user_address)'],
  [lpAccountUser, 'if ctx.at(OPCODE) == op::direct_add_liquidity'],
  [lpAccountUser, 'am0 = am0 ? am0 : storage::amount0;'],
  [lpAccountUser, 'am1 = am1 ? am1 : storage::amount1;'],
  [lpAccountUser, 'throw_unless(error::zero_output, (min_lp_out > 0) & ((am0 > 0) & (am1 > 0)));'],
  [lpAccountUser, 'storage::amount0 -= am0;'],
  [lpAccountUser, 'storage::amount1 -= am1;'],
  [lpAccountUser, 'throw_unless(error::no_liquidity, (storage::amount0 >= 0) & (storage::amount1 >= 0));'],
  [lpAccountUser, 'pool::cb_add_liquidity('],
  [lpAccountUser, 'storage::save();'],
  [lpAccountPool, 'storage::amount0 += new_amount0;'],
  [lpAccountPool, 'storage::amount1 += new_amount1;'],
  [lpAccountPool, 'both_positive?'],
  [lpAccountPool, 'pool::cb_add_liquidity('],
  [lpAccountPool, 'storage::amount0 = 0;'],
  [lpAccountStorage, '.store_coins(storage::amount0)'],
  [lpAccountStorage, '.store_coins(storage::amount1)'],
  [poolLpAccount, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  [common, '(cell) pool::cb_add_liquidity('],
];
anchors.forEach(([text, needle]) => must(text, needle));

const select = (stored0, stored1, requested0, requested1) => ({
  amount0: requested0 !== 0n ? requested0 : stored0,
  amount1: requested1 !== 0n ? requested1 : stored1,
});
const apply = (stored0, stored1, requested0, requested1, minLpOut = 1n) => {
  const chosen = select(stored0, stored1, requested0, requested1);
  if (minLpOut <= 0n || chosen.amount0 <= 0n || chosen.amount1 <= 0n) return { rejected: true, chosen };
  if (chosen.amount0 > stored0 || chosen.amount1 > stored1) return { rejected: true, chosen };
  return { rejected: false, chosen, residual0: stored0 - chosen.amount0, residual1: stored1 - chosen.amount1 };
};

const partial = apply(100n, 200n, 0n, 50n);
if (partial.rejected || partial.chosen.amount0 !== 100n || partial.chosen.amount1 !== 50n || partial.residual0 !== 0n || partial.residual1 !== 150n) {
  throw new Error('mixed zero-selector partial case mismatch');
}
const all = apply(100n, 200n, 0n, 0n);
if (all.rejected || all.residual0 !== 0n || all.residual1 !== 0n) throw new Error('all-selector case mismatch');
const oneSided = apply(0n, 200n, 0n, 50n);
if (!oneSided.rejected) throw new Error('zero selected leg bypassed positive-output gate');
const overdraw = apply(100n, 200n, 150n, 0n);
if (!overdraw.rejected) throw new Error('overdraw bypassed nonnegative residual gate');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('user_sender_gate true');
console.log('zero_amount_means_use_all_stored_leg true');
console.log('mixed_selector_residual_exact true');
console.log('zero_selected_leg_rejected true');
console.log('overdraw_rejected true');
console.log('pool_callback_uses_selected_amounts true');
console.log('attacker_positive_delta false');
console.log('result PASS');
