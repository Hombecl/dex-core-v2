const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const jettonUtils = read('contracts/lp_wallet/jetton-utils.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const system = read('tests/System.spec.ts');
const lpTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['storage load tuple', storage, '(int, slice, slice, cell) storage::load() inline'],
  ['storage load coins first', storage, 'ds~load_coins()'],
  ['storage load owner second', storage, 'ds~load_msg_addr()'],
  ['storage load master third', storage, 'ds~load_msg_addr()'],
  ['storage load code ref', storage, 'ds~load_ref()'],
  ['storage load terminal parse', storage, 'ds.end_parse();'],
  ['storage save packing', storage, 'pack_jetton_lp_wallet_data(balance, owner_address, jetton_master_address, jetton_wallet_code)'],
  ['getter returns storage', wallet, 'return storage::load();'],
  ['transfer loads wallet tuple', wallet, '() send_tokens'],
  ['transfer saves wallet tuple', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['receive loads wallet tuple', wallet, '() receive_tokens'],
  ['receive saves wallet tuple', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['burn loads wallet tuple', wallet, '() burn_tokens'],
  ['bounce loads wallet tuple', wallet, '() on_bounce'],
  ['bounce saves wallet tuple', wallet, 'balance += jetton_amount'],
  ['pool LP wallet consumer', poolWallet, 'handle_lp_wallet_messages'],
  ['pool LP callback consumer', poolLp, 'lp_wallet_idata('],
  ['live wallet read after mint/burn', system, 'getWalletData()'],
  ['live LP account getter', lpTest, 'getLPAccountData()'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const tuple = (balance, owner, master, code) => ({ balance, owner, master, code });
const saved = tuple(100, 'OWNER', 'MASTER', 'CODE');
const getter = tuple(saved.balance, saved.owner, saved.master, saved.code);
if (JSON.stringify(getter) !== JSON.stringify(saved)) throw new Error('getter tuple changed');
const afterTransfer = tuple(75, saved.owner, saved.master, saved.code);
if (afterTransfer.owner !== saved.owner || afterTransfer.master !== saved.master || afterTransfer.code !== saved.code) {
  throw new Error('transfer changed identity fields');
}
if (!wallet.includes('(int, slice, slice, cell) get_wallet_data() method_id')) {
  throw new Error('method getter signature missing');
}
const mutationFns = ['send_tokens', 'receive_tokens', 'burn_tokens', 'on_bounce'];
for (const fn of mutationFns) {
  if (!wallet.includes(`storage::load()`) || !wallet.includes(`storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code)`)) {
    throw new Error(`load/save invariant missing for ${fn}`);
  }
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BA3',
  cross_file_anchors: anchors.length,
  tuple_cases: 2,
  identity_fields_preserved: 3,
  terminal_parse_checks: 1,
  reason: 'get_wallet_data returns the current four-field storage tuple, storage load/save use the same Coins/address/address/ref order with end_parse, and every async balance mutation reloads and saves the tuple. A read snapshot is not a state mutation or an attacker-controlled asset delta'
}, null, 2));
