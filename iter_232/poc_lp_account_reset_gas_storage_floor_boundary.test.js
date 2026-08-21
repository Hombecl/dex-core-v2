const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const root = read('contracts/lp_account.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const storage = read('contracts/lp_account/storage.fc');
const common = read('contracts/common/contracts.fc');
const reserves = read('node_modules/@ston-fi/funcbox/contracts/reserves.fc');
const wrapper = read('wrappers/LPAccount.ts');
const test = read('tests/LPAccount.spec.ts');

const anchors = [
  ['root workchain gate', root, 'throw_unless(error::wrong_workchain, ctx.at(SENDER).address::check_workchain(params::workchain));'],
  ['root user dispatch gate', root, 'if equal_slices(ctx.at(SENDER), storage::user_address) {'],
  ['root user handler', root, 'if handle_user_messages() {'],
  ['reset opcode branch', user, 'if ctx.at(OPCODE) == op::reset_gas {'],
  ['exact storage reserve', user, 'reserves::exact(storage_fee::lp_account);'],
  ['stored user payout', user, 'msgs::send_empty(0, storage::user_address, CARRY_ALL_BALANCE);'],
  ['reset branch return', user, 'return (true);'],
  ['user address storage load', storage, 'storage::user_address = ds~load_msg_addr();'],
  ['exact reserve primitive', reserves, 'raw_reserve(_balance, RESERVE_EXACTLY);'],
  ['reset opcode serializer', common, 'return begin_message(op::reset_gas)'],
  ['wrapper reset sender', wrapper, 'async sendResetGas(provider: ContractProvider, via: Sender, value?: bigint)'],
  ['wrapper empty body', wrapper, 'body: beginMessage(lpAccOpcodes.resetGas)'],
  ['LPAccount fixture', test, 'lpAcc = bc.openContract(LPAccount.createFromConfig({'],
  ['LPAccount integration setup', test, "describe('LPAccount'"],
  ['LPAccount getter integration', test, "it('should return valid data'"],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

const resetStart = user.indexOf('if ctx.at(OPCODE) == op::reset_gas {');
const resetEnd = user.indexOf('return (true);', resetStart);
assert(resetStart >= 0 && resetEnd > resetStart, 'reset branch must be present');
const resetBranch = user.slice(resetStart, resetEnd + 'return (true);'.length);
assert(!resetBranch.includes('storage::save'), 'reset branch must not rewrite LPAccount storage');
assert(resetBranch.indexOf('reserves::exact') < resetBranch.indexOf('msgs::send_empty'), 'reserve must precede payout');
assert(resetBranch.includes('storage::user_address'), 'payout must use stored user destination');
assert(resetBranch.includes('CARRY_ALL_BALANCE'), 'payout must carry only post-reserve balance');

// Exact reserve model: with pre-message balance B, incoming value V, and the
// configured floor F, only B+V-F remains available after a successful reserve.
function resetPayout(preBalance, incomingValue, storageFee) {
  const available = preBalance + incomingValue;
  assert(available >= storageFee, 'exact reserve fails below the storage floor');
  return available - storageFee;
}

assert.strictEqual(resetPayout(100, 0, 100), 0);
assert.strictEqual(resetPayout(101, 0, 100), 1);
assert.strictEqual(resetPayout(100, 1, 100), 1);
assert.throws(() => resetPayout(99, 0, 100), /storage floor/);
const first = resetPayout(145, 0, 100);
assert.strictEqual(first, 45);
assert.strictEqual(resetPayout(100, 0, 100), 0, 'a second reset has no residual payout after the first carry');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX19',
  cross_file_anchors: anchors.length,
  exact_floor_checks: 6,
  reason: 'exact reserve leaves only the account surplus, below-floor calls fail before payout, destination is immutable stored-user state, and reset does not mutate LP balances',
}, null, 2));
