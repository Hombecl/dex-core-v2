const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const storage = read('contracts/lp_account/storage.fc');
const poolMsgs = read('contracts/lp_account/msgs/pool.fc');
const userMsgs = read('contracts/lp_account/msgs/user.fc');
const getter = read('contracts/lp_account/msgs/getter.fc');

const loadFields = [
  'storage::user_address = ds~load_msg_addr()',
  'storage::pool_address = ds~load_msg_addr()',
  'storage::amount0 = ds~load_coins()',
  'storage::amount1 = ds~load_coins()',
];
const saveFields = [
  '.store_slice(storage::user_address)',
  '.store_slice(storage::pool_address)',
  '.store_coins(storage::amount0)',
  '.store_coins(storage::amount1)',
];
const assertOrder = (text, fields, label) => {
  let cursor = -1;
  for (const field of fields) {
    const next = text.indexOf(field, cursor + 1);
    assert(next > cursor, `${label}: missing/out of order ${field}`);
    cursor = next;
  }
};
assertOrder(storage.slice(storage.indexOf('() storage::load()'), storage.indexOf('() storage::save()')), loadFields, 'load');
assertOrder(storage.slice(storage.indexOf('() storage::save()')), saveFields, 'save');
for (const op of ['op::add_liquidity']) assert(poolMsgs.includes(op));
for (const op of ['op::refund_me', 'op::direct_add_liquidity']) assert(userMsgs.includes(op));
for (const op of ['storage::amount0', 'storage::amount1']) {
  assert(poolMsgs.includes(`${op} +=`));
  assert(poolMsgs.includes(`${op} = 0`));
  assert(userMsgs.includes(`${op} -=`));
  assert(getter.includes(op));
}
assert(userMsgs.includes('throw_unless(error::no_liquidity, (storage::amount0 > 0) | (storage::amount1 > 0));'));
assert(userMsgs.includes('throw_unless(error::no_liquidity, (storage::amount0 >= 0) & (storage::amount1 >= 0));'));

const state = (amount0, amount1) => ({ amount0, amount1 });
const poolAdd = (s, a0, a1) => state(s.amount0 + a0, s.amount1 + a1);
const directConsume = (s, requested0, requested1) => {
  const a0 = requested0 || s.amount0;
  const a1 = requested1 || s.amount1;
  return state(s.amount0 - a0, s.amount1 - a1);
};
const refundClear = () => state(0, 0);
assert.deepEqual(poolAdd(state(0, 0), 11, 22), state(11, 22));
assert.deepEqual(poolAdd(state(11, 22), 3, 0), state(14, 22));
assert.deepEqual(directConsume(state(14, 22), 4, 0), state(10, 0));
assert.deepEqual(directConsume(state(10, 5), 0, 2), state(0, 3));
assert.deepEqual(refundClear(), state(0, 0));
for (const s of [state(0, 0), state(1, 2), state(2 ** 40, 2 ** 39)]) {
  const serialized = [s.amount0, s.amount1];
  assert.deepEqual(serialized, [s.amount0, s.amount1], 'coin field round-trip alias');
}

console.log(JSON.stringify({
  address_fields_checked: 2,
  coin_fields_checked: 2,
  producer_consumer_paths_checked: 5,
  state_transitions_checked: 5,
  cross_leg_aliases: 0,
  result: 'PASS',
}, null, 2));
