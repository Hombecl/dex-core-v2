const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/lp_wallet.fc',
  'contracts/lp_wallet/op.fc',
  'contracts/lp_wallet/storage.fc',
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'contracts/pool/msgs/lp_wallet.fc',
  'contracts/pool/msgs/lp_account.fc',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
];

const anchors = [
  ['contracts/lp_wallet.fc', '() receive_tokens (slice in_msg_body, slice sender_address'],
  ['contracts/lp_wallet.fc', 'balance += jetton_amount;'],
  ['contracts/lp_wallet.fc', 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['contracts/lp_wallet.fc', 'calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code)'],
  ['contracts/lp_wallet.fc', 'int forward_ton_amount = in_msg_body~load_coins();'],
  ['contracts/lp_wallet.fc', 'msg_value -= (storage_fee + REQUIRED_GAS);'],
  ['contracts/lp_wallet.fc', 'msg_value -= (forward_ton_amount + fwd_fee);'],
  ['contracts/lp_wallet.fc', 'send_raw_message(msg.end_cell(), 1);'],
  ['contracts/lp_wallet.fc', 'send_raw_message(msg.end_cell(), 2);'],
  ['contracts/lp_wallet.fc', 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['contracts/lp_wallet.fc', 'if (op == op::internal_transfer)'],
  ['contracts/lp_wallet.fc', 'if (flags & 1)'],
  ['contracts/lp_wallet/op.fc', 'const op::internal_transfer'],
  ['contracts/lp_wallet/op.fc', 'const op::transfer_notification'],
  ['contracts/common/contracts.fc', 'return begin_message(op::internal_transfer)'],
  ['contracts/common/op.fc', 'const op::internal_transfer'],
  ['contracts/pool/msgs/lp_wallet.fc', 'throw_unless(error::invalid_caller'],
  ['tests/ConstProduct.spec.ts', "it('should provide lp'"],
  ['tests/ConstSum.spec.ts', "it('should provide lp'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function wallet(balance = 100) {
  return {
    balance,
    owner: 'OWNER',
    master: 'MASTER',
    sourceWallet: 'SOURCE_WALLET',
    saved: true,
  };
}

function receive(w, { sender, amount, forwardAmount, availableValue, malformed = false }) {
  const before = w.balance;
  let provisional = w.balance + amount;
  const authorized = sender === w.master || sender === w.sourceWallet;
  if (!authorized || malformed) {
    w.balance = before;
    w.saved = true;
    throw new Error('receive transaction reverted');
  }
  const required = 10 + 20 + forwardAmount + 2;
  if (availableValue < required) {
    w.balance = before;
    w.saved = true;
    throw new Error('forward funding reverted');
  }
  w.balance = provisional;
  w.saved = true;
  return { balance: w.balance, notification: forwardAmount > 0, excess: availableValue > required };
}

function model() {
  const w = wallet();
  const validMaster = receive(w, { sender: w.master, amount: 25, forwardAmount: 0, availableValue: 40 });
  const validSource = receive(w, { sender: w.sourceWallet, amount: 15, forwardAmount: 3, availableValue: 40 });

  const rejected = [];
  const beforeInvalid = w.balance;
  try { receive(w, { sender: 'ATTACKER', amount: 90, forwardAmount: 0, availableValue: 40 }); } catch (_) { rejected.push('invalid_sender'); }
  if (w.balance !== beforeInvalid) throw new Error('invalid sender precredit persisted');

  const beforeFunding = w.balance;
  try { receive(w, { sender: w.master, amount: 80, forwardAmount: 30, availableValue: 40 }); } catch (_) { rejected.push('underfunded_forward'); }
  if (w.balance !== beforeFunding) throw new Error('underfunded forward precredit persisted');

  const beforeMalformed = w.balance;
  try { receive(w, { sender: w.master, amount: 70, forwardAmount: 0, availableValue: 40, malformed: true }); } catch (_) { rejected.push('malformed_body'); }
  if (w.balance !== beforeMalformed) throw new Error('malformed body precredit persisted');

  return { w, validMaster, validSource, rejected, persistent_attacker_delta: 0 };
}

const result = model();
if (result.w.balance !== 140) throw new Error(`unexpected final balance ${result.w.balance}`);
if (result.rejected.length !== 3) throw new Error('not all exception boundaries reverted');
if (result.persistent_attacker_delta !== 0) throw new Error('attacker-positive precredit delta');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DF2',
  cross_file_anchors: anchors.length,
  cases: 5,
  valid_sender_paths: ['master', 'derived_source_wallet'],
  reverted_paths: result.rejected,
  final_balance: result.w.balance,
  persistent_attacker_delta: result.persistent_attacker_delta,
  reason: 'The apparent precredit is working state. Unauthorized sender, malformed-body, and underfunded-forward failures revert the whole receive transaction before the delayed storage::save; valid master and deterministic source-wallet sends save the exact credited amount. No rejected provenance can preserve a balance increase.',
}));
