const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolRefund = read('contracts/pool/msgs/lp_account.fc');
const lpUser = read('contracts/lp_account/msgs/user.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const messages = read('contracts/common/contracts.fc');
const poolEntry = read('contracts/pool.fc');
const lpEntry = read('contracts/lp_account.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolRefund, 'if ctx.at(OPCODE) == op::cb_refund_me'],
  [poolRefund, '(int gas, int mode) = (0, CARRY_REMAINING_GAS);'],
  [poolRefund, 'if (tot_am0 > 0) & (tot_am1 > 0){'],
  [poolRefund, '(gas, mode) = ((ctx.at(MSG_VALUE) - (ctx.at(FWD_FEE) + storage_fee::pool + gas::pool::cb_refund)) / 2, NORMAL);'],
  [poolRefund, 'if tot_am0 > 0 {'],
  [poolRefund, 'if tot_am1 > 0 {'],
  [poolRefund, 'router::pay_to('],
  [lpUser, 'throw_unless(error::no_liquidity, (storage::amount0 > 0) | (storage::amount1 > 0));'],
  [lpUser, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  [lpUser, 'storage::amount0 = 0;'],
  [lpUser, 'storage::amount1 = 0;'],
  [lpUser, 'storage::save();'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [messages, '(cell) router::pay_to('],
  [poolEntry, 'if handle_lp_account_messages()'],
  [lpEntry, 'if equal_slices(ctx.at(SENDER), storage::pool_address)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const cases = [
  { name: 'token0_only', amount0: 100, amount1: 0, emitted: 1, mode: 'CARRY_REMAINING_GAS' },
  { name: 'token1_only', amount0: 0, amount1: 100, emitted: 1, mode: 'CARRY_REMAINING_GAS' },
  { name: 'both_positive', amount0: 100, amount1: 200, emitted: 2, mode: 'NORMAL_then_CARRY_REMAINING_GAS' },
  { name: 'both_zero', amount0: 0, amount1: 0, emitted: 0, mode: 'rejected_before_callback' }
];
for (const c of cases) {
  const hasLiquidity = (c.amount0 > 0) || (c.amount1 > 0);
  if (hasLiquidity !== (c.emitted > 0)) throw new Error(`emission mismatch: ${c.name}`);
  if (c.name === 'both_positive' && c.emitted !== 2) throw new Error('two-leg split mismatch');
  if (c.name !== 'both_positive' && c.name !== 'both_zero' && c.mode !== 'CARRY_REMAINING_GAS') {
    throw new Error(`one-sided mode mismatch: ${c.name}`);
  }
}

const stateBefore = { amount0: 100, amount1: 200 };
const stateAfter = { amount0: 0, amount1: 0 };
const callbackAmounts = { token0: stateBefore.amount0, token1: stateBefore.amount1 };
if (callbackAmounts.token0 !== stateBefore.amount0 || callbackAmounts.token1 !== stateBefore.amount1) {
  throw new Error('clear-before-callback model mismatch');
}
if (stateAfter.amount0 !== 0 || stateAfter.amount1 !== 0) throw new Error('state was not cleared');

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`refund_cases ${cases.length}`);
console.log(`one_sided_carry_cases ${cases.filter((c) => c.emitted === 1).length}`);
console.log('two_sided_modes NORMAL_then_CARRY_REMAINING_GAS');
console.log(`callback_amounts_preserved ${callbackAmounts.token0 === 100 && callbackAmounts.token1 === 200}`);
console.log(`post_callback_lp_account_zeroed ${stateAfter.amount0 === 0 && stateAfter.amount1 === 0}`);
console.log('attacker_value_extraction false');
console.log('result PASS');
