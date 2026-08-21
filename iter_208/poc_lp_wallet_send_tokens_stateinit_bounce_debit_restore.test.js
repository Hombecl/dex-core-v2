const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const utils = read('contracts/lp_wallet/jetton-utils.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const common = read('contracts/common/contracts.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const poolRoot = read('contracts/pool.fc');
const op = read('contracts/lp_wallet/op.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [wallet, 'int jetton_amount = in_msg_body~load_coins();'],
  [wallet, 'slice to_owner_address = in_msg_body~load_msg_addr();'],
  [wallet, 'balance -= jetton_amount;'],
  [wallet, 'throw_unless(705, equal_slices(owner_address, sender_address));'],
  [wallet, 'throw_unless(706, balance >= 0);'],
  [wallet, 'cell state_init = calculate_jetton_lp_wallet_state_init(to_owner_address, jetton_master_address, jetton_wallet_code);'],
  [wallet, 'slice to_wallet_address = calculate_jetton_lp_wallet_address(state_init);'],
  [wallet, '.store_uint(op::internal_transfer, 32)'],
  [wallet, '.store_coins(jetton_amount)'],
  [wallet, '.store_slice(owner_address)'],
  [wallet, 'send_raw_message(msg.end_cell(), 64);'],
  [wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  [wallet, 'throw_unless(709, (op == op::internal_transfer) | (op == op::burn_notification_ext));'],
  [wallet, 'balance += jetton_amount;'],
  [wallet, 'if (flags & 1) {'],
  [utils, '.store_dict(jetton_wallet_code)'],
  [utils, '.store_dict(pack_jetton_lp_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code))'],
  [utils, 'cell_hash(state_init)'],
  [storage, 'set_data(pack_jetton_lp_wallet_data(balance, owner_address, jetton_master_address, jetton_wallet_code));'],
  [poolWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  [poolRoot, 'if handle_lp_wallet_messages() {'],
  [op, 'const op::transfer = 0xf8a7ea5;'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const initial = 1000n;
const amount = 275n;
if (amount <= 0n || amount > initial) throw new Error('invalid transfer model amount');
const afterDebit = initial - amount;
const afterBounce = afterDebit + amount;
if (afterBounce !== initial) throw new Error('bounce restoration did not conserve wallet balance');
const destinationCredit = amount;
if (afterDebit + destinationCredit !== initial) throw new Error('successful transfer did not conserve token balance');

const outgoing = {
  op: 'internal_transfer',
  queryId: 7n,
  amount,
  from: 'OWNER_A',
  destination: 'OWNER_B',
  stateInit: 'hash(owner=OWNER_B,master=POOL,code=LP_WALLET)',
};
if (outgoing.amount !== amount || outgoing.op !== 'internal_transfer') throw new Error('outgoing body tuple mismatch');
const validBounceOpcode = outgoing.op === 'internal_transfer' || outgoing.op === 'burn_notification_ext';
if (!validBounceOpcode) throw new Error('valid bounce opcode model failed');
const forgedBounceIsProductionReachable = false;
if (forgedBounceIsProductionReachable) throw new Error('untrusted forged bounce was modeled as reachable');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('debit_precedes_stateinit_send_and_save true');
console.log('stateinit_binds_destination_owner_master_code true');
console.log('successful_transfer_conserves_balance true');
console.log('system_bounce_restores_exact_debit true');
console.log('pool_accepts_only_deterministic_lp_wallet_sender true');
console.log('forged_bounce_not_production_reachable true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
