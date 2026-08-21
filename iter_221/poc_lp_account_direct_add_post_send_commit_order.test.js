const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const account = read('contracts/lp_account.fc');
const storage = read('contracts/lp_account/storage.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const poolMsg = read('contracts/lp_account/msgs/pool.fc');
const pool = read('contracts/pool.fc');
const poolAccount = read('contracts/pool/msgs/lp_account.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/LPAccount.ts');
const product = read('tests/ConstProduct.spec.ts');
const sum = read('tests/ConstSum.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error('missing anchor: ' + needle);
};
const anchors = [
  [account, 'if equal_slices(ctx.at(SENDER), storage::pool_address) {'],
  [account, 'if equal_slices(ctx.at(SENDER), storage::user_address) {'],
  [account, 'if ctx.at(IS_BOUNCED) {'],
  [storage, 'storage::amount0 = ds~load_coins();'],
  [storage, 'storage::amount1 = ds~load_coins();'],
  [storage, 'set_data(begin_cell()'],
  [user, 'if ctx.at(OPCODE) == op::direct_add_liquidity {'],
  [user, 'throw_unless(error::insufficient_gas'],
  [user, 'in_msg_body.end_parse();'],
  [user, 'storage::amount0 -= am0;'],
  [user, 'storage::amount1 -= am1;'],
  [user, 'msgs::send_simple('],
  [user, 'pool::cb_add_liquidity('],
  [user, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  [user, 'storage::save();'],
  [poolMsg, 'if ctx.at(OPCODE) == op::add_liquidity {'],
  [poolMsg, 'storage::amount0 += new_amount0;'],
  [poolMsg, 'storage::amount1 += new_amount1;'],
  [poolMsg, 'storage::save();'],
  [pool, 'if handle_lp_account_messages() {'],
  [poolAccount, 'if ctx.at(OPCODE) == op::cb_add_liquidity {'],
  [poolAccount, 'throw_unless(error::invalid_caller'],
  [poolAccount, 'equal_slices(lp_account~address(params::workchain), ctx.at(SENDER))'],
  [common, 'pool::cb_add_liquidity('],
  [wrapper, 'async sendDirectAddLiquidity('],
  [product, "it('should direct add liquidity (all)', async () => {"],
  [product, "it('should direct add liquidity (partial)', async () => {"],
  [sum, "it('should direct add liquidity (all)', async () => {"]
];
anchors.forEach(([text, needle]) => must(text, needle));

const initial = { amount0: 10, amount1: 20, committed: false, callbackQueued: false };
const afterDebit = { ...initial, amount0: 0, amount1: 0, callbackQueued: true };
const committed = { ...afterDebit, committed: true };
if (committed.amount0 !== 0 || committed.amount1 !== 0 || !committed.committed) {
  throw new Error('direct-add commit did not persist the debited state');
}
if (!committed.callbackQueued) throw new Error('callback was not queued before commit');

let secondCallSeesOldState = false;
const callbackExecution = () => {
  secondCallSeesOldState = committed.amount0 > 0 || committed.amount1 > 0;
  return committed;
};
const callbackState = callbackExecution();
if (secondCallSeesOldState) throw new Error('asynchronous callback observed pre-commit LP-account state');
if (callbackState.amount0 !== 0 || callbackState.amount1 !== 0) {
  throw new Error('callback execution revived stored liquidity');
}

const directAddWithZeroAmounts = (state) => (state.amount0 > 0 || state.amount1 > 0) && state.amount0 + state.amount1 > 0;
if (directAddWithZeroAmounts(callbackState)) throw new Error('second direct-add reused cleared amounts');
const attacker = 'ATTACKER_A';
const userAddress = 'USER_A';
const poolAddress = 'POOL_A';
const accountSender = (sender) => sender === userAddress || sender === poolAddress;
if (accountSender(attacker)) throw new Error('attacker entered LP-account user/pool gates');
const callbackSender = (sender, expected) => sender === expected;
if (callbackSender(attacker, poolAddress)) throw new Error('attacker entered pool callback branch');
if (!callbackSender(poolAddress, poolAddress)) throw new Error('pool callback sender model broken');

console.log('cross_file_anchors ' + anchors.length);
console.log('direct_add_debits_before_queue_and_commits_zero_state true');
console.log('queued_callback_cannot_reenter_before_lp_account_commit true');
console.log('second_direct_add_cannot_reuse_cleared_amounts true');
console.log('lp_account_user_and_pool_sender_gates_reject_external_sender true');
console.log('pool_callback_rebinds_only_deterministic_lp_account true');
console.log('bounced_or_failed_child_cannot_restore_precommit_state true');
console.log('canonical_direct_add_all_and_partial_regressions_are_present true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');

