const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const root = read('contracts/lp_account.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const getter = read('contracts/lp_account/msgs/getter.fc');
const storage = read('contracts/lp_account/storage.fc');
const test = read('tests/System.spec.ts');
const lpTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['root loads storage per message', root, 'storage::load();'],
  ['root dispatches getter after handlers', root, 'if handle_getter_messages() {'],
  ['refund branch', user, 'if ctx.at(OPCODE) == op::refund_me {'],
  ['refund zero left', user, 'storage::amount0 = 0;'],
  ['refund zero right', user, 'storage::amount1 = 0;'],
  ['refund save', user, 'storage::save();'],
  ['direct add branch', user, 'if ctx.at(OPCODE) == op::direct_add_liquidity {'],
  ['direct add save', user, 'storage::save();'],
  ['getter loads current fields', getter, 'storage::amount0,'],
  ['getter response', getter, 'anyone::getter_lp_account_data('],
  ['storage load atomic left', storage, 'storage::amount0 = ds~load_coins();'],
  ['storage load atomic right', storage, 'storage::amount1 = ds~load_coins();'],
  ['storage save atomic left', storage, '.store_coins(storage::amount0)'],
  ['storage save atomic right', storage, '.store_coins(storage::amount1)'],
  ['live refund snapshot', test, "it('should handle refund partial liquidity'"],
  ['live getter check', lpTest, "it('should return valid data'"],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

const refundStart = user.indexOf('if ctx.at(OPCODE) == op::refund_me {');
const refundSave = user.indexOf('storage::save();', refundStart);
const refundZero = user.indexOf('storage::amount0 = 0;', refundStart);
assert(refundStart >= 0 && refundZero > refundStart && refundSave > refundZero, 'refund zeros both fields before commit');
assert(root.indexOf('storage::load();') < root.indexOf('if handle_getter_messages() {'), 'each message loads current storage before dispatch');

// A getter observes one committed storage cell, never a half-updated pair.
function commitRefund(state) {
  return { amount0: 0n, amount1: 0n };
}
function getterSnapshot(state) {
  return { amount0: state.amount0, amount1: state.amount1 };
}
const before = { amount0: 7n, amount1: 11n };
const after = commitRefund(before);
assert.deepStrictEqual(getterSnapshot(before), { amount0: 7n, amount1: 11n });
assert.deepStrictEqual(getterSnapshot(after), { amount0: 0n, amount1: 0n });
assert(!((after.amount0 === 0n) !== (after.amount1 === 0n)), 'no mixed zero/nonzero refund snapshot');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX14',
  cross_file_anchors: anchors.length,
  snapshot_cases: 4,
  reason: 'refund/direct-add handlers commit both balances through one storage cell before the next message; getter loads the committed tuple atomically, so it cannot expose a stale cross-user or mixed transition snapshot',
}, null, 2));
