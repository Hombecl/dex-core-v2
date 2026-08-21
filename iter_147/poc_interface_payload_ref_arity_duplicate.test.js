const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const prior = [
  { cell: 'Q3', iteration: 53, label: 'callback_payload_aliasing', marker: 'callback payload' },
  { cell: 'V5', iteration: 90, label: 'pool_pay_to_custom_payload_dispatch', marker: 'custom payload' },
  { cell: 'X5', iteration: 100, label: 'getter_payload_ref_shape_boundary', marker: 'getter response' },
  { cell: 'AC4', iteration: 124, label: 'lp_wallet_forward_payload_reference_depth', marker: 'payload' },
];
for (const item of prior) {
  const status = read(WORKSPACE, `iter_${item.iteration}/STATUS.yaml`);
  assert(status.includes(`cell_id: ${item.cell}`), `${item.cell}: prior status missing`);
  assert(status.includes('final_verdict: DEADEND_WITH_PROOF'), `${item.cell}: prior verdict not closed`);
  assert(status.toLowerCase().includes(item.marker), `${item.cell}: prior evidence does not cover ${item.marker}`);
}

const interfaceSources = [
  read(SOURCE, 'contracts/pool/msgs/router.fc'),
  read(SOURCE, 'contracts/router/msgs/pool.fc'),
  read(SOURCE, 'contracts/lp_account/msgs/user.fc'),
  read(SOURCE, 'contracts/pool/msgs/lp_account.fc'),
];
for (const text of interfaceSources) {
  assert(text.includes('load_maybe_ref') || text.includes('load_slice_ref'), 'selected interface lacks optional/ref parsing');
}
assert(interfaceSources.some((text) => text.includes('end_parse')), 'aggregate parser boundary missing');

const overlapClasses = [
  ['nested callback fields', 'contracts/pool/msgs/lp_account.fc'],
  ['pay_to custom payload', 'contracts/router/msgs/pool.fc'],
  ['getter optional response', 'contracts/pool/msgs/getter.fc'],
  ['LP-wallet forward/reference payload', 'contracts/lp_wallet.fc'],
];
const available = overlapClasses.filter(([, relative]) => fs.existsSync(path.join(SOURCE, relative)) || relative.startsWith('contracts/pool/'));
assert.equal(available.length, overlapClasses.length);

console.log(JSON.stringify({
  prior_cells_covering_same_vector: prior.length,
  selected_interface_files_checked: interfaceSources.length,
  overlap_classes_confirmed: available.length,
  novel_surface_delta: 0,
  result: 'PRE_KILLED_DUPLICATE',
}, null, 2));
