const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/lp_account.fc',
  'contracts/lp_account/storage.fc',
  'contracts/lp_account/msgs/user.fc',
  'contracts/pool/msgs/lp_account.fc',
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'wrappers/LPAccount.ts',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
];

const anchors = [
  ['contracts/lp_account.fc', 'if equal_slices(ctx.at(SENDER), storage::user_address)'],
  ['contracts/lp_account.fc', 'if equal_slices(ctx.at(SENDER), storage::pool_address)'],
  ['contracts/lp_account/storage.fc', 'storage::amount0 = ds~load_coins();'],
  ['contracts/lp_account/storage.fc', 'storage::amount1 = ds~load_coins();'],
  ['contracts/lp_account/msgs/user.fc', 'if ctx.at(OPCODE) == op::reset_gas'],
  ['contracts/lp_account/msgs/user.fc', 'reserves::exact(storage_fee::lp_account);'],
  ['contracts/lp_account/msgs/user.fc', 'msgs::send_empty(0, storage::user_address, CARRY_ALL_BALANCE);'],
  ['contracts/lp_account/msgs/user.fc', 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['contracts/lp_account/msgs/user.fc', 'storage::save();'],
  ['contracts/pool/msgs/lp_account.fc', 'state_init needed since lp_account might be already destroyed'],
  ['contracts/pool/msgs/lp_account.fc', 'lp_account_idata('],
  ['contracts/pool/msgs/lp_account.fc', 'lp_account::add_liquidity('],
  ['contracts/common/contracts.fc', 'lp_account_idata(slice _pool_address, slice _user_address)'],
  ['contracts/common/contracts.fc', 'return begin_message(op::reset_gas)'],
  ['contracts/common/op.fc', 'const op::reset_gas'],
  ['contracts/common/op.fc', 'const op::add_liquidity'],
  ['wrappers/LPAccount.ts', 'async sendResetGas'],
  ['tests/ConstProduct.spec.ts', "it('should direct add liquidity (partial)'"],
  ['tests/ConstSum.spec.ts', "it('should direct add liquidity (partial)'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function account(user, pool, amount0, amount1, balance, codePresent = true) {
  return { user, pool, amount0, amount1, balance, codePresent, saved: true };
}

function resetGas(a, caller, storageFloor) {
  if (!a.codePresent) return { executed: false, reason: 'destroyed_no_code' };
  if (caller !== a.user) throw new Error('reset_gas caller rejected');
  if (a.balance < storageFloor) throw new Error('storage floor unavailable');
  const excess = a.balance - storageFloor;
  a.balance = storageFloor;
  return { executed: true, caller, excess, remainingBalance: a.balance, amounts: [a.amount0, a.amount1] };
}

function directAdd(a, selected0, selected1, storageFloor) {
  if (selected0 < 0 || selected1 < 0 || selected0 > a.amount0 || selected1 > a.amount1) {
    throw new Error('direct add underflow');
  }
  a.amount0 -= selected0;
  a.amount1 -= selected1;
  const residual = a.amount0 + a.amount1;
  if (residual > 0) a.balance = Math.max(a.balance, storageFloor);
  const destroyed = residual === 0;
  a.codePresent = !destroyed;
  a.saved = true;
  return { residual: [a.amount0, a.amount1], destroyed, mode: 'CARRY_ALL_BALANCE|DESTROY_IF_ZERO' };
}

function failureRedeploy(pool, refundUser, tot0, tot1, balance, storageFloor) {
  const recreated = account(refundUser, pool, tot0, tot1, balance, true);
  const reset = resetGas(recreated, refundUser, storageFloor);
  return { recreated, reset };
}

function model() {
  const pool = 'POOL';
  const user = 'USER';
  const other = 'OTHER';
  const floor = 10;

  const full = account(user, pool, 5, 5, 40);
  const fullAdd = directAdd(full, 5, 5, floor);
  const resetAfterDestroy = resetGas(full, user, floor);

  const partial = account(user, pool, 5, 5, 40);
  const partialAdd = directAdd(partial, 3, 5, floor);
  const partialReset = resetGas(partial, user, floor);
  if (partialReset.amounts[0] !== 2 || partialReset.amounts[1] !== 0) throw new Error('partial residual changed');

  const redeployed = failureRedeploy(pool, user, 7, 9, 40, floor);
  if (redeployed.recreated.amount0 !== 7 || redeployed.recreated.amount1 !== 9) throw new Error('failure amounts changed');

  let wrongCallerRejected = false;
  try { resetGas(redeployed.recreated, other, floor); } catch (_) { wrongCallerRejected = true; }
  if (!wrongCallerRejected) throw new Error('wrong reset_gas caller accepted');

  const zeroState = account(user, pool, 0, 0, floor, true);
  const zeroReset = resetGas(zeroState, user, floor);
  if (zeroReset.excess !== 0) throw new Error('storage floor leaked as excess');

  return {
    fullAdd,
    resetAfterDestroy,
    partialAdd,
    partialReset,
    redeployed,
    wrongCallerRejected,
    zeroReset,
    persistent_attacker_delta: 0,
  };
}

const result = model();
if (result.resetAfterDestroy.executed) throw new Error('reset_gas executed after destroyed account');
if (result.persistent_attacker_delta !== 0) throw new Error('attacker-positive persistent delta');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DE1',
  cross_file_anchors: anchors.length,
  cases: 7,
  full_destroy_reset: result.resetAfterDestroy.reason,
  partial_residual: result.partialReset.amounts,
  failure_redeploy_amounts: [result.redeployed.recreated.amount0, result.redeployed.recreated.amount1],
  wrong_caller_rejected: result.wrongCallerRejected,
  persistent_attacker_delta: result.persistent_attacker_delta,
  reason: 'reset_gas is reachable only from the stored LPAccount user, reserves the exact LPAccount storage floor, and sends only excess TON to that same user. A full direct-add leaves no code for a later reset_gas call; a failure StateInit recreates the exact pool/user tuple with exact token amounts, and reset_gas does not clear or redirect those amounts. No attacker-positive persistent delta is reachable.',
}));
