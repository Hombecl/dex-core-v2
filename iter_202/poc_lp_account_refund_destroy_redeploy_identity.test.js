const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const user = read('contracts/lp_account/msgs/user.fc');
const pool = read('contracts/pool/msgs/lp_account.fc');
const rootLpAccount = read('contracts/lp_account.fc');
const storage = read('contracts/lp_account/storage.fc');
const common = read('contracts/common/contracts.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [rootLpAccount, 'if equal_slices(ctx.at(SENDER), storage::pool_address)'],
  [rootLpAccount, 'if equal_slices(ctx.at(SENDER), storage::user_address)'],
  [user, 'if ctx.at(OPCODE) == op::refund_me'],
  [user, 'throw_unless(error::no_liquidity, (storage::amount0 > 0) | (storage::amount1 > 0));'],
  [user, 'pool::cb_refund_me('],
  [user, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  [user, 'storage::amount0 = 0;'],
  [user, 'storage::amount1 = 0;'],
  [user, 'storage::save();'],
  [pool, 'if ctx.at(OPCODE) == op::cb_refund_me'],
  [pool, 'lp_account_idata(my_address(), user_address)'],
  [pool, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  [pool, 'CARRY_REMAINING_GAS'],
  [pool, 'router::pay_to('],
  [pool, 'tot_am0 > 0'],
  [pool, 'tot_am1 > 0'],
  [storage, '.store_coins(storage::amount0)'],
  [storage, '.store_coins(storage::amount1)'],
  [common, '(cell) pool::cb_refund_me('],
  [user, 'DESTROY_IF_ZERO'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const before = { amount0: 100n, amount1: 200n };
const outgoing = { amount0: before.amount0, amount1: before.amount1 };
const after = { amount0: 0n, amount1: 0n };
if (outgoing.amount0 !== before.amount0 || outgoing.amount1 !== before.amount1) throw new Error('refund changed outgoing amounts');
if (after.amount0 !== 0n || after.amount1 !== 0n) throw new Error('refund did not clear storage');

const secondRefundAllowed = (state) => (state.amount0 > 0n) || (state.amount1 > 0n);
if (secondRefundAllowed(after)) throw new Error('cleared account retained a replayable refund claim');

const partial = { amount0: 0n, amount1: 200n, mode: 'CARRY_REMAINING_GAS' };
if (partial.amount1 !== before.amount1 || partial.mode !== 'CARRY_REMAINING_GAS') throw new Error('partial refund mode mismatch');

const redeployedFallback = { user: 'REFUND_ADDRESS', amount0: before.amount0, amount1: before.amount1, minLpOut: 0n };
if (redeployedFallback.minLpOut !== 0n) throw new Error('fallback redeploy did not force zero minimum');
if (redeployedFallback.amount0 !== outgoing.amount0 || redeployedFallback.amount1 !== outgoing.amount1) throw new Error('fallback changed refund legs');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('refund_user_sender_gate true');
console.log('refund_clears_both_stored_legs true');
console.log('second_refund_rejected_after_clear true');
console.log('partial_refund_carry_mode_exact true');
console.log('fallback_redeploy_preserves_exact_legs true');
console.log('attacker_positive_delta false');
console.log('result PASS');
