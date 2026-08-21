const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const utils = read('contracts/lp_wallet/jetton-utils.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const common = read('contracts/common/contracts.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['receive entry', wallet, '() receive_tokens (slice in_msg_body, slice sender_address, int my_ton_balance, int fwd_fee, int msg_value) impure {'],
  ['storage load', wallet, '(int balance, slice owner_address, slice jetton_master_address, cell jetton_wallet_code) = storage::load();'],
  ['amount credit', wallet, 'balance += jetton_amount;'],
  ['from address parse', wallet, 'slice from_address = in_msg_body~load_msg_addr();'],
  ['response parse', wallet, 'slice response_address = in_msg_body~load_msg_addr();'],
  ['master/source OR gate', wallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['deterministic source branch', wallet, 'equal_slices(calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code), sender_address));'],
  ['forward amount parse', wallet, 'int forward_ton_amount = in_msg_body~load_coins();'],
  ['owner notification', wallet, '.store_slice(owner_address)'],
  ['notification amount', wallet, '.store_coins(jetton_amount)'],
  ['excess response guard', wallet, 'if ((response_address.preload_uint(2) != 0) & (msg_value > 0))'],
  ['persistent save', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['state tuple pack', utils, 'pack_jetton_lp_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code)'],
  ['full state hash', utils, '.store_uint(cell_hash(state_init), 256)'],
  ['storage save primitive', storage, 'set_data(pack_jetton_lp_wallet_data(balance, owner_address, jetton_master_address, jetton_wallet_code));'],
  ['mint message builder', common, 'jetton_wallet::mint('],
  ['mint source field', common, '.store_slice(_from) ;; from_address'],
  ['pool deterministic wallet', lpAccount, 'lp_wallet~address(params::workchain),'],
  ['pool sender auth', poolWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  ['live mint burn path', system, "it('should handle mint & burn liquidity', async () => {"],
  ['live invalid path', system, "it('should handle invalid transfers', async () => {"],
  ['live complex path', constProduct, "it('should handle more complex scenarios', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const derived = (from, master, code) => `wallet(${from}|${master}|${code})`;
const receiveModel = ({ sender, from, master = 'MASTER', code = 'CODE', amount = 25, parseOk = true, amountOk = true }) => {
  if (!parseOk || !amountOk) return { result: 'throw_before_auth_or_save', persistentDelta: 0 };
  const source = derived(from, master, code);
  const accepted = sender === master || sender === source;
  if (!accepted) return { result: 'throw_auth_after_working_credit_before_save', persistentDelta: 0 };
  return { result: 'save_exact_credit', persistentDelta: amount, source };
};

const cases = [
  receiveModel({ sender: 'MASTER', from: 'POOL_USER' }),
  receiveModel({ sender: derived('POOL_USER', 'MASTER', 'CODE'), from: 'POOL_USER' }),
  receiveModel({ sender: derived('OTHER_USER', 'MASTER', 'CODE'), from: 'POOL_USER' }),
  receiveModel({ sender: derived('POOL_USER', 'OTHER_MASTER', 'CODE'), from: 'POOL_USER' }),
  receiveModel({ sender: 'ATTACKER', from: 'POOL_USER' }),
  receiveModel({ sender: 'MASTER', from: 'POOL_USER', parseOk: false }),
  receiveModel({ sender: derived('POOL_USER', 'MASTER', 'OTHER_CODE'), from: 'POOL_USER' }),
];
if (cases[0].persistentDelta !== 25 || cases[1].persistentDelta !== 25) throw new Error('valid master/source branch failed to credit exact amount');
if (cases[2].persistentDelta !== 0 || cases[3].persistentDelta !== 0 || cases[4].persistentDelta !== 0) throw new Error('mismatched source/master passed auth');
if (cases[5].persistentDelta !== 0 || cases[6].persistentDelta !== 0) throw new Error('malformed or code-mismatched receive persisted credit');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BB5',
  cross_file_anchors: anchors.length,
  branch_cases: cases.length,
  persistent_deltas: cases.map((c) => c.persistentDelta),
  accepted_branches: ['configured_master', 'exact_deterministic_source_wallet'],
  rejected_branches: ['wrong_source_wallet', 'wrong_master_tuple', 'attacker_sender', 'malformed_body', 'wrong_code_tuple'],
  reason: 'receive_tokens credits a working balance before an OR authorization gate but saves only after the gate and optional forwarding. The master branch requires the stored master sender; the alternate branch requires the exact StateInit address derived from from_address, stored master, and stored wallet code. Changing any tuple component changes the address and throws before save; valid branches persist only the encoded amount'
}, null, 2));
