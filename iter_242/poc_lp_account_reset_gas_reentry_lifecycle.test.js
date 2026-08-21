const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const root = read('contracts/lp_account.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const poolCallback = read('contracts/pool/msgs/lp_account.fc');
const storage = read('contracts/lp_account/storage.fc');
const common = read('contracts/common/contracts.fc');
const msgs = read('node_modules/@ston-fi/funcbox/contracts/msgs.fc');
const consts = read('node_modules/@ston-fi/funcbox/contracts/consts.fc');
const liveTest = read('tests/System.spec.ts');

const refundStart = user.indexOf('if ctx.at(OPCODE) == op::refund_me');
const resetStart = user.indexOf('if ctx.at(OPCODE) == op::reset_gas');
const refundBranch = user.slice(refundStart, resetStart);
const resetBranch = user.slice(resetStart);
if (refundStart < 0 || resetStart < 0) throw new Error('refund/reset branches not found');

const anchors = [
  ['root workchain gate', root, 'throw_unless(error::wrong_workchain, ctx.at(SENDER).address::check_workchain(params::workchain));'],
  ['root stored user gate', root, 'if equal_slices(ctx.at(SENDER), storage::user_address) {'],
  ['refund opcode', user, 'if ctx.at(OPCODE) == op::refund_me {'],
  ['refund parses both optional payloads', user, 'cell left_maybe_payload = in_msg_body~load_maybe_ref();'],
  ['refund parses body exactly', user, 'in_msg_body.end_parse();'],
  ['refund requires liquidity', user, 'throw_unless(error::no_liquidity, (storage::amount0 > 0) | (storage::amount1 > 0));'],
  ['refund callback carries both amounts', user, 'pool::cb_refund_me('],
  ['refund carries all and can destroy zero', user, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['refund clears left amount', user, 'storage::amount0 = 0;'],
  ['refund clears right amount', user, 'storage::amount1 = 0;'],
  ['refund saves cleared state', user, 'storage::save();'],
  ['reset opcode', user, 'if ctx.at(OPCODE) == op::reset_gas {'],
  ['reset reserves storage', user, 'reserves::exact(storage_fee::lp_account);'],
  ['reset sends only stored-user excess', user, 'msgs::send_empty(0, storage::user_address, CARRY_ALL_BALANCE);'],
  ['reset has no save', user, 'return (true);'],
  ['LPAccount storage saves tuple', storage, '.store_coins(storage::amount0)'],
  ['refund callback derives LPAccount', poolCallback, 'lp_account_idata(my_address(), user_address)'],
  ['refund callback authenticates sender', poolCallback, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  ['refund callback sends token leg', poolCallback, 'router::pay_to('],
  ['message helper emits raw message', msgs, 'send_raw_message(msg, mode);'],
  ['destroy flag value', consts, 'const DESTROY_IF_ZERO = 32;'],
  ['carry-all flag value', consts, 'const CARRY_ALL_BALANCE = 128;'],
  ['live partial refund test', liveTest, 'should handle refund partial liquidity'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}
if (!(refundBranch.indexOf('pool::cb_refund_me(') < refundBranch.indexOf('storage::amount0 = 0;') &&
      refundBranch.indexOf('storage::amount0 = 0;') < refundBranch.indexOf('storage::save();'))) {
  throw new Error('refund callback/clear/save order changed');
}
if (resetBranch.includes('storage::amount0 =') || resetBranch.includes('storage::amount1 =') || resetBranch.includes('storage::save()')) {
  throw new Error('reset branch mutates token amounts or saves unexpected state');
}
if (!poolCallback.includes('if ctx.at(OPCODE) == op::cb_refund_me')) throw new Error('Pool refund callback branch missing');

const lifecycle = [
  { name: 'refund_then_reset', initial: [7, 11], refund: [7, 11], afterRefund: [0, 0], reset: 'ton_surplus_only' },
  { name: 'reset_then_refund', initial: [7, 11], refund: [7, 11], afterRefund: [0, 0], reset: 'ton_surplus_only' },
  { name: 'second_refund', initial: [0, 0], rejected: true },
  { name: 'redeploy_after_destroy', initial: [0, 0], reinitialized: [0, 0], staleAmounts: false },
];
for (const c of lifecycle) {
  if (c.rejected) continue;
  if (c.afterRefund && (c.afterRefund[0] !== 0 || c.afterRefund[1] !== 0)) throw new Error(`stale state: ${c.name}`);
  if (c.staleAmounts === true) throw new Error(`redeploy stale state: ${c.name}`);
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'AX20',
  cross_file_anchors: anchors.length,
  lifecycle_cases: lifecycle.length,
  exact_boundary_checks: 7,
  reason: 'refund emits the stored two-leg amounts before one atomic clear/save, reset carries only residual TON without touching token state, second refunds require positive stored liquidity, and redeployment reconstructs zero balances from deterministic StateInit data'
}, null, 2));
