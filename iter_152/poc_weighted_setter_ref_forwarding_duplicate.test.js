const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8');
for (const [cell, iteration, label] of [
  ['P10xC2', 47, 'governance_rate x amount_conservation'],
  ['Q4', 54, 'rate_transition_boundary'],
  ['U5', 85, 'weighted_rate_setter_domain_boundary'],
]) {
  const status = read(WORKSPACE, `iter_${iteration}/STATUS.yaml`);
  assert(status.includes(`cell_id: ${cell}`), `${cell}: status missing`);
  assert(status.includes(`cell_label: ${label}`), `${cell}: label missing`);
  assert(status.includes('final_verdict: DEADEND_WITH_PROOF'), `${cell}: prior cell not closed`);
}
const builder = read(SOURCE, 'contracts/router/pools/weighted_stableswap/contracts.fc');
const admin = read(SOURCE, 'contracts/router/pools/weighted_stableswap/ext_admin.fc');
const consumer = read(SOURCE, 'contracts/pool/pools/weighted_stableswap/ext_router.fc');
const storage = read(SOURCE, 'contracts/pool/pools/weighted_stableswap/storage.fc');
const setter = read(SOURCE, 'contracts/pool/pools/weighted_stableswap/setter.fc');
const pool = read(SOURCE, 'contracts/pool.fc');
assert(builder.includes('.store_ref(begin_cell()'));
assert(admin.includes('slice new_setter'));
assert(admin.includes('pool::internal_set_params('));
assert(consumer.includes('slice additional_data = in_msg_body~load_slice_ref()'));
assert(consumer.includes('slice new_setter = additional_data~load_msg_addr()'));
assert(consumer.includes('storage::rate_setter_address = new_setter'));
assert(storage.includes('storage::rate_setter_address = w_params_data~load_msg_addr()'));
assert(setter.includes('new_rate > 0'));
assert(pool.includes('storage::rate_setter_address'));

console.log(JSON.stringify({
  prior_duplicate_cells: ['P10xC2/iter_47', 'Q4/iter_54', 'U5/iter_85'],
  producer_consumer_ref_edges_checked: 1,
  setter_dispatch_guards_checked: 2,
  novel_surface_delta: 0,
  disposition: 'PRE_KILLED_DUPLICATE_TRUSTED_ROLE',
  result: 'PASS',
}, null, 2));
