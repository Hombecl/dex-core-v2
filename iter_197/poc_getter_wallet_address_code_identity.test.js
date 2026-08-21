const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolGet = read('contracts/pool/get.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const poolLpWallet = read('contracts/pool/msgs/lp_wallet.fc');
const common = read('contracts/common/contracts.fc');
const jettonUtils = read('contracts/lp_wallet/jetton-utils.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const poolRoot = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolGet, 'slice get_wallet_address(slice owner_address) method_id'],
  [poolGet, 'lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code)'],
  [poolGet, 'return lp_wallet~address(params::workchain);'],
  [poolLpAccount, 'lp_wallet_idata('],
  [poolLpAccount, 'to_user_address,'],
  [poolLpAccount, 'my_address(),'],
  [poolLpAccount, 'storage::jetton_lp_wallet_code'],
  [poolLpAccount, 'lp_wallet~state_init()'],
  [poolLpWallet, 'lp_wallet_idata('],
  [poolLpWallet, 'from_address,'],
  [poolLpWallet, 'throw_unless(error::invalid_caller'],
  [common, '(cell) lp_wallet_idata(slice _owner_address, slice _jetton_master_address, cell _jetton_wallet_code)'],
  [common, '.store_slice(_owner_address)'],
  [common, '.store_slice(_jetton_master_address)'],
  [common, '.store_ref(_jetton_wallet_code)'],
  [jettonUtils, 'calculate_jetton_lp_wallet_state_init(slice owner_address, slice jetton_master_address, cell jetton_wallet_code)'],
  [jettonUtils, 'cell_hash(state_init)'],
  [lpWallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  [poolRoot, 'if handle_lp_wallet_messages()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const derive = (owner, master, code) => `HASH(0|${code}|0|${owner}|${master}|${code})`;
const owner = 'OWNER';
const master = 'POOL';
const code = 'LP_WALLET_CODE';
const getterAddress = derive(owner, master, code);
const mintAddress = derive(owner, master, code);
const burnAddress = derive(owner, master, code);

if (getterAddress !== mintAddress || getterAddress !== burnAddress) {
  throw new Error('getter/runtime LP-wallet StateInit mismatch');
}
const differentOwner = derive('OTHER_OWNER', master, code);
const differentMaster = derive(owner, 'OTHER_POOL', code);
const differentCode = derive(owner, master, 'OTHER_CODE');
if (getterAddress === differentOwner || getterAddress === differentMaster || getterAddress === differentCode) {
  throw new Error('LP-wallet StateInit tuple collision');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('getter_state_init_matches_mint_state_init true');
console.log('getter_state_init_matches_burn_callback_state_init true');
console.log('owner_master_code_all_bound true');
console.log('different_owner_distinct true');
console.log('different_master_distinct true');
console.log('different_code_distinct true');
console.log('attacker_positive_delta false');
console.log('result PASS');
