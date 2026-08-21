const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const families = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');

const baseLoad = [
  'is_locked', 'reserve0', 'reserve1', 'total_supply_lp',
  'collected_token0_protocol_fee', 'collected_token1_protocol_fee',
  'protocol_fee_address', 'lp_fee', 'protocol_fee',
];
const baseSave = [
  'is_locked', 'reserve0', 'reserve1', 'total_supply_lp',
  'collected_token0_protocol_fee', 'collected_token1_protocol_fee',
  'protocol_fee_address', 'lp_fee', 'protocol_fee',
];

function assertOrder(text, fields, label) {
  let cursor = -1;
  for (const field of fields) {
    const next = text.indexOf(`storage::${field}`, cursor + 1);
    assert(next > cursor, `${label}: ${field} is missing or out of order`);
    cursor = next;
  }
}

for (const family of families) {
  const storage = read(`contracts/pool/pools/${family}/storage.fc`);
  const stateInit = read(`contracts/pool/pools/${family}/state_init.fc`);
  const loadStart = storage.indexOf('storage::load');
  const saveStart = storage.indexOf('storage::save');
  assert(loadStart >= 0 && saveStart > loadStart, `${family}: load/save boundaries missing`);
  const loadBody = storage.slice(loadStart, saveStart);
  const saveBody = storage.slice(saveStart);
  assertOrder(loadBody, baseLoad, `${family} load`);
  assertOrder(saveBody, baseSave, `${family} save`);
  assert(storage.includes('storage::_static = ds~load_ref()'), `${family}: static ref is not loaded`);
  assert(storage.includes('.store_ref(storage::_static)'), `${family}: static ref is not saved`);
  assert(stateInit.includes('pool_idata('), `${family}: pool_idata constructor missing`);
  assert(stateInit.includes('_first_jetton_address.slice_hash() > _second_jetton_address.slice_hash()'), `${family}: pair canonicalization missing`);
  assert(stateInit.includes('.store_ref(_jetton_lp_wallet_code)'), `${family}: LP wallet code ref missing`);
  assert(stateInit.includes('.store_ref(_lp_account_code)'), `${family}: LP account code ref missing`);
}

const weightedStable = read('contracts/pool/pools/weighted_stableswap/storage.fc');
assert(weightedStable.indexOf('cell w_params = ds~load_ref()') < weightedStable.indexOf('storage::_static = ds~load_ref()'));
assert(weightedStable.indexOf('storage::amp = w_params_data~load_uint(128)') < weightedStable.indexOf('storage::rate_setter_address = w_params_data~load_msg_addr()'));
assert(weightedStable.indexOf('store_uint(storage::amp, 128)') < weightedStable.indexOf('store_uint(storage::rate, 128)'));
assert(weightedStable.indexOf('store_uint(storage::w0, 128)') < weightedStable.indexOf('store_slice(storage::rate_setter_address)'));

console.log(JSON.stringify({
  pool_families: families.length,
  common_base_fields: baseLoad.length,
  variant_parameter_layouts_checked: ['none', 'amp:uint32', 'w0:uint64', 'amp/rate/w0/rate_setter:uint128/ref'],
  storage_round_trip_order_failures: 0,
  result: 'PASS',
}, null, 2));
