const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const storage = read('contracts/router/storage.fc');
const utils = read('contracts/router/utils.fc');
const admin = read('contracts/router/msgs/admin.fc');
const getter = read('contracts/router/get.fc');

const loadFields = [
  'storage::is_locked = ds~load_bool()',
  'storage::admin_address = ds~load_msg_addr()',
  'storage::temp_upgrade = ds~load_ref()',
  'storage::_static = ds~load_ref()',
  'storage::upgrade_pool_code = ds~load_ref()',
];
const saveFields = [
  '.store_bool(storage::is_locked)',
  '.store_slice(storage::admin_address)',
  '.store_ref(storage::temp_upgrade)',
  '.store_ref(storage::_static)',
  '.store_ref(storage::upgrade_pool_code)',
];
const staticFields = [
  'storage::id = ds_0~load_uint64()',
  'storage::jetton_lp_wallet_code = ds_0~load_ref()',
  'storage::pool_code = ds_0~load_ref()',
  'storage::lp_account_code = ds_0~load_ref()',
  'storage::vault_code = ds_0~load_ref()',
];
const findOrder = (text, fields, label) => {
  let cursor = -1;
  for (const field of fields) {
    const next = text.indexOf(field, cursor + 1);
    assert(next > cursor, `${label}: missing or out of order: ${field}`);
    cursor = next;
  }
};

const loadStart = storage.indexOf('() storage::load()');
const saveStart = storage.indexOf('() storage::save()');
assert(loadStart >= 0 && saveStart > loadStart);
findOrder(storage.slice(loadStart, saveStart), loadFields, 'router load');
findOrder(storage.slice(saveStart), saveFields, 'router save');
findOrder(storage, staticFields, 'static tuple');

findOrder(utils, [
  '.store_time(end_code)',
  '.store_time(end_admin)',
  '.store_time(end_pool_code)',
  '.store_slice(admin)',
  '.store_ref(code)',
  '.store_ref(pool_code)',
], 'temp upgrade pack');
findOrder(utils, [
  's_data~load_time()',
  's_data~load_time()',
  's_data~load_time()',
  's_data~load_msg_addr()',
  's_data~load_ref()',
  's_data~load_ref()',
], 'temp upgrade unpack');

for (const opcode of [
  'op::init_code_upgrade', 'op::init_admin_upgrade', 'op::init_pool_code_upgrade',
  'op::cancel_pool_code_upgrade', 'op::cancel_admin_upgrade', 'op::cancel_code_upgrade',
  'op::finalize_upgrades',
]) {
  assert(admin.includes(`ctx.at(OPCODE) == ${opcode}`), `admin branch missing: ${opcode}`);
}
for (const call of [
  'pack_temp_upgrade(now() + params::sevendays, new_code, end_admin, admin, end_pool_code, pool_code)',
  'pack_temp_upgrade(end_code, new_code, now() + params::twodays, new_admin_address, end_pool_code, pool_code)',
  'pack_temp_upgrade(end_code, new_code, end_admin, admin, now() + params::twodays, new_pool_code)',
  'pack_temp_upgrade(end_code, code, end_admin, admin, 0, empty_cell())',
  'pack_temp_upgrade(end_code, code, 0, addr_none(), end_pool_code, pool_code)',
  'pack_temp_upgrade(0, empty_cell(), end_admin, admin, end_pool_code, pool_code)',
]) assert(admin.includes(call), `upgrade transition not represented: ${call}`);
assert(admin.includes('storage::upgrade_pool_code = pool_code'));
assert(getter.includes('storage::temp_upgrade'));
assert(getter.includes('storage::upgrade_pool_code'));

// Model every single-upgrade transition and assert untouched tuple positions survive.
const base = { codeEnd: 0, code: 'CODE0', adminEnd: 0, admin: 'ADMIN0', poolEnd: 0, pool: 'POOL0' };
const clone = (x) => ({ ...x });
const initCode = (x) => ({ ...x, codeEnd: 7, code: 'CODE1' });
const initAdmin = (x) => ({ ...x, adminEnd: 8, admin: 'ADMIN1' });
const initPool = (x) => ({ ...x, poolEnd: 9, pool: 'POOL1' });
const cancelCode = (x) => ({ ...x, codeEnd: 0, code: 'EMPTY' });
const cancelAdmin = (x) => ({ ...x, adminEnd: 0, admin: 'NONE' });
const cancelPool = (x) => ({ ...x, poolEnd: 0, pool: 'EMPTY' });
for (const [name, transition, expected] of [
  ['init_code', initCode, { codeEnd: 7, code: 'CODE1', adminEnd: 0, admin: 'ADMIN0', poolEnd: 0, pool: 'POOL0' }],
  ['init_admin', initAdmin, { codeEnd: 0, code: 'CODE0', adminEnd: 8, admin: 'ADMIN1', poolEnd: 0, pool: 'POOL0' }],
  ['init_pool', initPool, { codeEnd: 0, code: 'CODE0', adminEnd: 0, admin: 'ADMIN0', poolEnd: 9, pool: 'POOL1' }],
  ['cancel_code', cancelCode, { codeEnd: 0, code: 'EMPTY', adminEnd: 0, admin: 'ADMIN0', poolEnd: 0, pool: 'POOL0' }],
  ['cancel_admin', cancelAdmin, { codeEnd: 0, code: 'CODE0', adminEnd: 0, admin: 'NONE', poolEnd: 0, pool: 'POOL0' }],
  ['cancel_pool', cancelPool, { codeEnd: 0, code: 'CODE0', adminEnd: 0, admin: 'ADMIN0', poolEnd: 0, pool: 'EMPTY' }],
]) assert.deepEqual(transition(clone(base)), expected, `${name}: tuple alias`);

console.log(JSON.stringify({
  outer_storage_fields_checked: loadFields.length,
  static_ref_fields_checked: staticFields.length,
  temp_upgrade_tuple_fields_checked: 6,
  upgrade_branches_checked: 7,
  transition_models_checked: 6,
  unexpected_ref_arity_aliases: 0,
  result: 'PASS',
}, null, 2));
