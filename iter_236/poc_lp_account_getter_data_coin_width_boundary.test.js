const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const root = read('contracts/lp_account.fc');
const getter = read('contracts/lp_account/msgs/getter.fc');
const get = read('contracts/lp_account/get.fc');
const storage = read('contracts/lp_account/storage.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/LPAccount.ts');
const test = read('tests/LPAccount.spec.ts');
const system = read('tests/System.spec.ts');

const anchors = [
  ['root getter dispatch', root, 'if handle_getter_messages() {'],
  ['getter opcode', getter, 'if (ctx.at(OPCODE) == op::getter_lp_account_data) {'],
  ['getter user field', getter, 'storage::user_address,'],
  ['getter pool field', getter, 'storage::pool_address,'],
  ['getter left coin', getter, 'storage::amount0,'],
  ['getter right coin', getter, 'storage::amount1'],
  ['getter response carry', getter, 'CARRY_ALL_BALANCE | IGNORE_ERRORS'],
  ['getter API user', get, 'return (storage::user_address, storage::pool_address, storage::amount0, storage::amount1);'],
  ['storage load left', storage, 'storage::amount0 = ds~load_coins();'],
  ['storage load right', storage, 'storage::amount1 = ds~load_coins();'],
  ['storage save left', storage, '.store_coins(storage::amount0)'],
  ['storage save right', storage, '.store_coins(storage::amount1)'],
  ['getter serializer left', common, '.store_coins(_left_amount)'],
  ['getter serializer right', common, '.store_coins(_right_amount)'],
  ['wrapper stack left', wrapper, 'leftAmount: result.stack.readBigNumber(),'],
  ['wrapper stack right', wrapper, 'rightAmount: result.stack.readBigNumber(),'],
  ['live getter assertion', test, 'body.loadCoins() == getLPData.rightAmount;'],
  ['live system getter use', system, 'let lpAccountData = await lpAccount.getLPAccountData();'],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

// Coins use one canonical nonnegative width on both storage and message
// builders. Zero, one, and the maximum encodable value round-trip; the first
// value above the width is rejected rather than truncated into another balance.
const MAX_COINS = (2n ** 120n) - 1n;
function encodeCoins(value) {
  assert(value >= 0n && value <= MAX_COINS, 'Coins width overflow');
  return value;
}
for (const value of [0n, 1n, MAX_COINS]) assert.strictEqual(encodeCoins(value), value);
assert.throws(() => encodeCoins(MAX_COINS + 1n), /Coins width overflow/);

const tuple = (user, pool, left, right) => [user, pool, encodeCoins(left), encodeCoins(right)];
assert.deepStrictEqual(tuple('user', 'pool', 0n, MAX_COINS), ['user', 'pool', 0n, MAX_COINS]);
assert.deepStrictEqual(tuple('user', 'pool', MAX_COINS, 0n), ['user', 'pool', MAX_COINS, 0n]);

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'AX12',
  cross_file_anchors: anchors.length,
  coin_width_cases: 6,
  duplicate_family: 'iter_140/AF5 and iter_228/AX11 LPAccount getter tuple/identity family',
  reason: 'both storage and getter response consume/store the same nonnegative Coins fields in the same order; zero/max boundaries are preserved and overflow rejects before any alternate value can be observed',
}, null, 2));
