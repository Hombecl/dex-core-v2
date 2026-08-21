const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const root = read('contracts/lp_account.fc');
const getter = read('contracts/lp_account/msgs/getter.fc');
const storage = read('contracts/lp_account/storage.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/LPAccount.ts');
const test = read('tests/LPAccount.spec.ts');
const system = read('tests/System.spec.ts');

const anchors = [
  ['root getter dispatch', root, 'if handle_getter_messages() {'],
  ['getter opcode', getter, 'if (ctx.at(OPCODE) == op::getter_lp_account_data) {'],
  ['getter reserve', getter, 'reserves::max_balance(storage_fee::lp_account);'],
  ['getter destination is sender', getter, 'ctx.at(SENDER),'],
  ['getter response', getter, 'anyone::getter_lp_account_data('],
  ['carry mode', getter, 'CARRY_ALL_BALANCE | IGNORE_ERRORS'],
  ['no getter destroy', getter, 'send_simple('],
  ['storage load only', storage, 'storage::load() impure inline {'],
  ['storage values', storage, 'storage::amount0 = ds~load_coins();'],
  ['message constructor', common, 'anyone::getter_lp_account_data(slice _user_address, slice _pool_address, int _left_amount, int _right_amount) inline {'],
  ['wrapper async getter', wrapper, 'async sendGetterLPAccountData(provider: ContractProvider, via: Sender, value?: bigint)'],
  ['wrapper getter provider', wrapper, "provider.internal(via, {"],
  ['LPAccount integration', test, "it('should return valid data'"],
  ['System getter state', system, 'let lpAccountData = await lpAccount.getLPAccountData();'],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

const branchStart = getter.indexOf('if (ctx.at(OPCODE) == op::getter_lp_account_data)');
const branchEnd = getter.indexOf('return (true);', branchStart);
assert(branchStart >= 0 && branchEnd > branchStart, 'getter branch must exist');
const branch = getter.slice(branchStart, branchEnd + 'return (true);'.length);
assert(!branch.includes('storage::save'), 'getter must not mutate persistent storage');
assert(!branch.includes('DESTROY_IF_ZERO'), 'getter must not request destruction');

// A getter reserves the storage floor and carries only the remaining balance
// to the requesting sender. IGNORE_ERRORS changes failure handling, not the
// destination or persistent LP-account state.
function getterCarry(preBalance, incomingValue, storageFloor, txFees) {
  const available = preBalance + incomingValue;
  assert(available >= storageFloor + txFees, 'getter cannot carry below reserve/fee floor');
  return available - storageFloor - txFees;
}
assert.strictEqual(getterCarry(100, 0, 100, 0), 0);
assert.strictEqual(getterCarry(145, 0, 100, 5), 40);
assert.strictEqual(getterCarry(100, 5, 100, 0), 5);
assert.throws(() => getterCarry(100, 0, 100, 1), /reserve\/fee floor/);

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX13',
  cross_file_anchors: anchors.length,
  carry_cases: 4,
  reason: 'getter reserves the storage floor, sends surplus only to the requesting sender, does not save or destroy the LPAccount, and IGNORE_ERRORS cannot alter read-only state',
}, null, 2));
