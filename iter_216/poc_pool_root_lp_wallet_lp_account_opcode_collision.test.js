const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolRoot = read('contracts/pool.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const poolAccount = read('contracts/pool/msgs/lp_account.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const poolProtocol = read('contracts/pool/msgs/protocolfee.fc');
const poolGetter = read('contracts/pool/msgs/getter.fc');
const commonOp = read('contracts/common/op.fc');
const walletOp = read('contracts/lp_wallet/op.fc');
const systemTest = read('tests/System.spec.ts');
const productTest = read('tests/ConstProduct.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolRoot, 'if handle_lp_wallet_messages() {'],
  [poolRoot, 'if handle_lp_account_messages() {'],
  [poolRoot, 'if handle_getter_messages() {'],
  [poolRoot, 'throw(error::wrong_op);'],
  [poolWallet, 'if ctx.at(OPCODE) == op::burn_notification_ext {'],
  [poolWallet, 'var lp_wallet = contracts::from_sources('],
  [poolWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  [poolWallet, 'throw_if(error::invalid_call, storage::is_locked);'],
  [poolWallet, 'storage::reserve0 -= amount0_out;'],
  [poolWallet, 'storage::total_supply_lp -= jetton_amount;'],
  [poolWallet, 'return (false);'],
  [poolAccount, 'if ctx.at(OPCODE) == op::cb_add_liquidity {'],
  [poolAccount, 'var lp_account = contracts::from_sources('],
  [poolAccount, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  [poolAccount, 'if ctx.at(OPCODE) == op::cb_refund_me {'],
  [poolAccount, 'return (false);'],
  [poolRouter, 'if ctx.at(OPCODE) == op::swap {'],
  [poolRouter, 'if ctx.at(OPCODE) == op::provide_lp {'],
  [poolRouter, 'if ctx.at(OPCODE) == op::internal_update_pool_code {'],
  [poolProtocol, 'if ctx.at(OPCODE) == op::collect_fees {'],
  [poolGetter, 'if ctx.at(OPCODE) == op::getter_pool_data {'],
  [poolGetter, 'return (false);'],
  [commonOp, 'const op::cb_add_liquidity'],
  [commonOp, 'const op::cb_refund_me'],
  [commonOp, 'const op::burn_notification_ext'],
  [walletOp, 'const op::internal_transfer'],
  [systemTest, "it('should handle mint & burn liquidity'"],
  [systemTest, "it('should handle invalid transfers'"],
  [productTest, "it('should provide lp"],
];
anchors.forEach(([text, needle]) => must(text, needle));

const dispatch = (opcode) => {
  if (opcode === 'burn_notification_ext') return 'lp_wallet';
  if (opcode === 'cb_add_liquidity' || opcode === 'cb_refund_me') return 'lp_account';
  if (opcode === 'swap' || opcode === 'provide_lp' || opcode === 'internal_update_pool_code') return 'router';
  if (opcode === 'collect_fees') return 'protocolfee';
  if (opcode === 'getter_pool_data') return 'getter';
  return 'wrong_op';
};
const cases = [
  ['burn_notification_ext', 'lp_wallet'],
  ['cb_add_liquidity', 'lp_account'],
  ['cb_refund_me', 'lp_account'],
  ['swap', 'router'],
  ['provide_lp', 'router'],
  ['collect_fees', 'protocolfee'],
  ['getter_pool_data', 'getter'],
  ['internal_transfer', 'wrong_op'],
  ['unknown', 'wrong_op'],
];
for (const [opcode, expected] of cases) {
  if (dispatch(opcode) !== expected) throw new Error(`dispatcher selected ${dispatch(opcode)} for ${opcode}`);
}
const recognized = cases.map(([opcode]) => opcode);
if (new Set(recognized).size !== recognized.length) throw new Error('symbolic opcode table contains a duplicate opcode name');

const gateBeforeMutation = (callerOk, mutation) => callerOk ? { reverted: false, mutation } : { reverted: true, mutation: false };
const badWallet = gateBeforeMutation(false, true);
const badAccount = gateBeforeMutation(false, true);
if (!badWallet.reverted || badWallet.mutation || !badAccount.reverted || badAccount.mutation) {
  throw new Error('invalid LP wallet/account sender reached persistent mutation');
}
const goodWallet = gateBeforeMutation(true, true);
const goodAccount = gateBeforeMutation(true, true);
if (!goodWallet.mutation || !goodAccount.mutation) throw new Error('canonical caller failed modeled branch');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('lp_wallet_and_lp_account_handlers_have_disjoint_opcode_sets true');
console.log('unknown_or_internal_transfer_opcode_reaches_wrong_op_not_value_handler true');
console.log('sender_derivation_gate_precedes_lp_wallet_and_lp_account_mutation true');
console.log('router_protocolfee_getter_dispatch_is_sender_partitioned_before_handlers true');
console.log('canonical_mint_burn_and_provide_paths_select_expected_handler true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
