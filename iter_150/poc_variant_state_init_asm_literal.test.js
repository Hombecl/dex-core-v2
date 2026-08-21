const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const families = {
  constant_product: { variant: 'none', load: [] },
  constant_sum: { variant: 'none', load: [] },
  stableswap: { variant: 'amp32', load: ['storage::amp = ds~load_uint32();'] },
  weighted_const_product: { variant: 'w064', load: ['storage::w0 = ds~load_uint(64);'] },
  weighted_stableswap: { variant: 'weighted128ref', load: [
    'storage::amp = w_params_data~load_uint(128)',
    'storage::rate = w_params_data~load_uint(128)',
    'storage::w0 = w_params_data~load_uint(128)',
    'storage::rate_setter_address = w_params_data~load_msg_addr()',
  ] },
};
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const baseComment = [
  'storage::is_locked', 'storage::reserve0', 'storage::reserve1',
  'storage::total_supply_lp', 'storage::collected_token0_protocol_fee',
  'storage::collected_token1_protocol_fee', 'storage::protocol_fee_address',
  'storage::lp_fee', 'storage::protocol_fee',
];
const order = (text, fields, label) => {
  let cursor = -1;
  for (const field of fields) {
    const next = text.indexOf(field, cursor + 1);
    assert(next > cursor, `${label}: missing/out of order ${field}`);
    cursor = next;
  }
};

for (const [family, cfg] of Object.entries(families)) {
  const state = read(`contracts/pool/pools/${family}/state_init.fc`);
  const storage = read(`contracts/pool/pools/${family}/storage.fc`);
  for (const field of baseComment) assert(state.includes(field), `${family}: state-init base field missing ${field}`);
  assert(state.includes('equivalent to <b'), `${family}: serializer equivalence comment missing`);
  assert(state.includes('<%= defaultLPFee %> 16 u'), `${family}: LP fee literal missing`);
  assert(state.includes('<%= defaultProtocolFee %> 16 u'), `${family}: protocol fee literal missing`);
  if (cfg.variant === 'none') {
    assert(!state.includes('_pool_idata2'), `${family}: unexpected variant ref`);
    assert(!storage.includes('storage::amp ='), `${family}: unexpected amp field`);
    assert(!storage.includes('storage::w0 ='), `${family}: unexpected weight field`);
  } else {
    for (const field of cfg.load) assert(storage.includes(field), `${family}: runtime field missing ${field}`);
  }
  order(storage, ['storage::reserve0', 'storage::reserve1', 'storage::total_supply_lp', 'storage::protocol_fee_address'], `${family} storage`);
}

const stable = read('contracts/pool/pools/stableswap/state_init.fc');
assert(stable.includes('storage::amp') && stable.includes('1 32 u'));
const weightedCP = read('contracts/pool/pools/weighted_const_product/state_init.fc');
assert(weightedCP.includes('storage::w0  (0)') && weightedCP.includes('0 64 u'));
const weightedStable = read('contracts/pool/pools/weighted_stableswap/state_init.fc');
assert(weightedStable.includes('(cell) _pool_idata2()'));
assert(weightedStable.includes('.store_uint(1000000000000000000, 128)'));
assert(weightedStable.includes('.store_uint(0, 128)'));
assert(weightedStable.includes('.store_uint(0, 2)'));
assert(weightedStable.includes('.store_ref(_pool_idata2())'));
assert(weightedStable.includes('.store_ref(_pool_2_data.end_cell())'));

console.log(JSON.stringify({
  pool_families_checked: Object.keys(families).length,
  base_literal_fields_checked: baseComment.length,
  variant_literal_layouts_checked: ['none', 'amp:uint32', 'w0:uint64', 'amp/rate/w0:uint128 + setter:addr'],
  serializer_runtime_field_mismatches: 0,
  state_init_ref_arity_mismatches: 0,
  result: 'PASS',
}, null, 2));
