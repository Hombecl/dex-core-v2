const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const prior = read(WORKSPACE, 'iter_84/STATUS.yaml');
const priorCallers = read(WORKSPACE, 'iter_84/callers-grep.txt');
assert(prior.includes('cell_id: U4'));
assert(prior.includes('cell_label: lp_wallet_codecell_sender_collision'));
assert(prior.includes('final_verdict: DEADEND_WITH_PROOF'));
assert(priorCallers.includes('calculate_jetton_lp_wallet_state_init'));

const utils = read(SOURCE, 'contracts/lp_wallet/jetton-utils.fc');
const runtime = read(SOURCE, 'contracts/lp_wallet.fc');
const common = read(SOURCE, 'contracts/common/contracts.fc');
assert(utils.includes('store_dict(jetton_wallet_code)'));
assert(utils.includes('store_dict(pack_jetton_lp_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code))'));
assert(utils.includes('calculate_user_jetton_lp_wallet_address'));
assert(runtime.includes('calculate_jetton_lp_wallet_state_init(to_owner_address, jetton_master_address, jetton_wallet_code)'));
assert(runtime.includes('calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code)'));
assert(common.includes('lp_wallet_idata(slice _owner_address, slice _jetton_master_address, cell _jetton_wallet_code)'));
assert(common.includes('.store_ref(_jetton_wallet_code)'));

console.log(JSON.stringify({
  prior_duplicate_cells: ['U4/iter_84', 'AG2/iter_141-142 planning'],
  state_init_encoding_functions_checked: 3,
  store_dict_slots_checked: 2,
  deterministic_derivation_call_sites_checked: 2,
  novel_surface_delta: 0,
  result: 'PRE_KILLED_DUPLICATE',
}, null, 2));
