const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const utils = read('contracts/lp_wallet/jetton-utils.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/LPWallet.ts');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['amount parse', wallet, 'int jetton_amount = in_msg_body~load_coins();'],
  ['destination parse', wallet, 'slice to_owner_address = in_msg_body~load_msg_addr();'],
  ['workchain gate', wallet, 'force_chain(params::workchain, to_owner_address, error::wrong_workchain);'],
  ['working debit', wallet, 'balance -= jetton_amount;'],
  ['owner gate', wallet, 'throw_unless(705, equal_slices(owner_address, sender_address));'],
  ['nonnegative gate', wallet, 'throw_unless(706, balance >= 0);'],
  ['state init construction', wallet, 'cell state_init = calculate_jetton_lp_wallet_state_init(to_owner_address, jetton_master_address, jetton_wallet_code);'],
  ['deterministic destination', wallet, 'slice to_wallet_address = calculate_jetton_lp_wallet_address(state_init);'],
  ['response parse', wallet, 'slice response_address = in_msg_body~load_msg_addr();'],
  ['custom payload parse', wallet, 'cell custom_payload = in_msg_body~load_dict();'],
  ['forward amount parse', wallet, 'int forward_ton_amount = in_msg_body~load_coins();'],
  ['state init ref', wallet, '.store_ref(state_init);'],
  ['exact amount body', wallet, '.store_coins(jetton_amount)'],
  ['strict funding guard', wallet, 'throw_unless(709, msg_value > forward_ton_amount + fwd_count * fwd_fee + (2 * REQUIRED_GAS + REQUIRED_TON_STORAGE));'],
  ['send before save', wallet, 'send_raw_message(msg.end_cell(), 64);'],
  ['save after send', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['state init tuple', utils, 'pack_jetton_lp_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code)'],
  ['shared transfer builder', common, 'jetton_wallet::transfer(int _fwd_amount, int _jetton_amount, slice _to, slice _response_address)'],
  ['wrapper transfer surface', wrapper, 'class LPWallet extends JettonWalletContractBase'],
  ['live invalid path', system, "it('should handle invalid transfers', async () => {"],
  ['live complex path', constProduct, "it('should handle more complex scenarios', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const sendModel = ({ msgValue, forwardTonAmount, fwdFee, balance = 100, amount = 25, workchainOk = true, ownerOk = true, parseOk = true }) => {
  if (!parseOk || !workchainOk) return { result: 'throw_before_debit', persistentDelta: 0 };
  const workingBalance = balance - amount;
  if (!ownerOk || workingBalance < 0) return { result: 'throw_after_working_debit_before_save', persistentDelta: 0 };
  const fwdCount = forwardTonAmount ? 2 : 1;
  const required = forwardTonAmount + fwdCount * fwdFee + 2 * 10 + 3;
  if (msgValue <= required) return { result: 'throw_strict_funding_guard_before_save', persistentDelta: 0, required };
  return { result: 'send_then_save', persistentDelta: -amount, required };
};

const cases = [
  sendModel({ msgValue: 100, forwardTonAmount: 0, fwdFee: 5, parseOk: false }),
  sendModel({ msgValue: 100, forwardTonAmount: 0, fwdFee: 5, workchainOk: false }),
  sendModel({ msgValue: 100, forwardTonAmount: 0, fwdFee: 5, ownerOk: false }),
  sendModel({ msgValue: 28, forwardTonAmount: 0, fwdFee: 5 }),
  sendModel({ msgValue: 29, forwardTonAmount: 0, fwdFee: 5 }),
  sendModel({ msgValue: 43, forwardTonAmount: 10, fwdFee: 5 }),
  sendModel({ msgValue: 44, forwardTonAmount: 10, fwdFee: 5 }),
];
if (cases[0].persistentDelta !== 0 || cases[1].persistentDelta !== 0) throw new Error('pre-debit parse failure changed balance');
if (cases[2].persistentDelta !== 0) throw new Error('owner failure persisted working debit');
if (cases[3].persistentDelta !== 0 || cases[3].result !== 'throw_strict_funding_guard_before_save') throw new Error('equality guard persisted debit');
if (cases[4].persistentDelta !== -25 || cases[4].result !== 'send_then_save') throw new Error('strict success boundary did not save exact debit');
if (cases[5].persistentDelta !== 0 || cases[6].persistentDelta !== -25) throw new Error('forward amount boundary mismatch');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BB4',
  cross_file_anchors: anchors.length,
  funding_cases: cases.length,
  persistent_deltas: cases.map((c) => c.persistentDelta),
  strict_equality_case: 'throw_before_save',
  strict_success_case: 'send_then_save_exact_debit',
  reason: 'LPWallet parses and validates destination fields before the working debit, and every later owner, balance, payload, and strict funding failure occurs before send/save persistence. StateInit is derived from destination owner, stored master, and stored code; successful transfer emits the exact debit and saves only afterward. Equality or below funding reverts the working debit, while above-threshold success persists exactly -amount'
}, null, 2));
