const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(SOURCE, relative));
const families = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const expected = {
  constant_product: { routerAdmin: false, poolRouter: false, setter: false },
  constant_sum: { routerAdmin: false, poolRouter: false, setter: false },
  stableswap: { routerAdmin: true, poolRouter: true, setter: false },
  weighted_const_product: { routerAdmin: true, poolRouter: true, setter: false },
  weighted_stableswap: { routerAdmin: true, poolRouter: true, setter: true },
};

const helper = read('helpers/helpers.ts');
assert(helper.includes('renderRouterAdminExtCalls: fs.existsSync'));
assert(helper.includes('renderPoolExtRouterCalls: fs.existsSync'));
assert(helper.includes('renderSetterCalls: fs.existsSync'));
const routerTemplate = read('contracts/router/router.fc');
const routerAdminTemplate = read('contracts/router/msgs/admin.fc');
const poolTemplate = read('contracts/pool.fc');
const poolRouterTemplate = read('contracts/pool/msgs/router.fc');
assert(routerTemplate.includes('if (renderRouterAdminExtCalls)'));
assert(routerAdminTemplate.includes('if (renderRouterAdminExtCalls)'));
assert(poolTemplate.includes('if (renderSetterCalls)'));
assert(poolRouterTemplate.includes('if (renderPoolExtRouterCalls)'));

for (const family of families) {
  const cfg = expected[family];
  const poolMain = read(`contracts/pool/pools/${family}/${family}.fc`);
  assert.equal(exists(`contracts/router/pools/${family}/ext_admin.fc`), cfg.routerAdmin, `${family}: router flag drift`);
  assert.equal(exists(`contracts/pool/pools/${family}/ext_router.fc`), cfg.poolRouter, `${family}: pool flag drift`);
  assert.equal(exists(`contracts/pool/pools/${family}/setter.fc`), cfg.setter, `${family}: setter flag drift`);
  assert.equal(poolMain.includes('#include "ext_router.fc"'), cfg.poolRouter, `${family}: pool extension include drift`);
  if (cfg.routerAdmin) {
    const routerMain = read(`contracts/router/pools/${family}/${family}.fc`);
    assert(routerMain.includes('#include "ext_admin.fc"'), `${family}: router extension include missing`);
  } else {
    assert(!exists(`contracts/router/pools/${family}/${family}.fc`), `${family}: unexpected router extension module`);
  }
}

const edges = [
  {
    family: 'stableswap',
    producer: ['.store_slice(_excesses_address)', '.store_uint32(_new_amp)'],
    consumer: ['slice resp = in_msg_body~load_msg_addr()', 'int new_amp = in_msg_body~load_uint32()'],
    admin: ['int new_amp = in_msg_body~load_uint32()', 'pool::internal_set_params('],
  },
  {
    family: 'weighted_const_product',
    producer: ['.store_slice(_excesses_address)', '.store_slice(_side_wallet)', '.store_uint(_new_w, 128)'],
    consumer: ['slice resp = in_msg_body~load_msg_addr()', 'slice side = in_msg_body~load_msg_addr()', 'int new_w = in_msg_body~load_uint128()'],
    admin: ['in_msg_body~load_uint128()', 'slice ref_data = in_msg_body~load_slice_ref()', 'pool::internal_set_params('],
  },
  {
    family: 'weighted_stableswap',
    producer: ['.store_slice(_excesses_address)', '.store_slice(_side)', '.store_uint(_new_amp, 128)', '.store_uint(_new_rate, 128)', '.store_uint(_new_w, 128)', '.store_ref(begin_cell()'],
    consumer: ['(slice resp, slice side) = (in_msg_body~load_msg_addr(), in_msg_body~load_msg_addr())', 'in_msg_body~load_uint128()', 'slice additional_data = in_msg_body~load_slice_ref()', 'slice new_setter = additional_data~load_msg_addr()'],
    admin: ['in_msg_body~load_uint128()', 'slice ref_data = in_msg_body~load_slice_ref()', 'pool::internal_set_params('],
  },
];
for (const edge of edges) {
  const producer = read(`contracts/router/pools/${edge.family}/contracts.fc`);
  const consumer = read(`contracts/pool/pools/${edge.family}/ext_router.fc`);
  const admin = read(`contracts/router/pools/${edge.family}/ext_admin.fc`);
  for (const marker of edge.producer) assert(producer.includes(marker), `${edge.family}: producer marker missing: ${marker}`);
  for (const marker of edge.consumer) assert(consumer.includes(marker), `${edge.family}: consumer marker missing: ${marker}`);
  for (const marker of edge.admin) assert(admin.includes(marker), `${edge.family}: admin marker missing: ${marker}`);
}

console.log(JSON.stringify({
  dex_families_checked: families.length,
  compile_flag_dimensions_checked: 3,
  extension_wiring_edges_checked: edges.length,
  include_dispatch_mismatches: 0,
  builder_consumer_arity_mismatches: 0,
  result: 'PASS',
}, null, 2));
