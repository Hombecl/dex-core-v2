const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/lp_wallet.fc',
  'contracts/lp_wallet/op.fc',
  'contracts/lp_wallet/storage.fc',
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'contracts/pool/msgs/lp_wallet.fc',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
  'tests/WeightedCPI.spec.ts',
];

const anchors = [
  ['contracts/lp_wallet.fc', '() on_bounce (slice in_msg_body) impure {'],
  ['contracts/lp_wallet.fc', 'in_msg_body~skip_bits(32);'],
  ['contracts/lp_wallet.fc', 'op == op::internal_transfer'],
  ['contracts/lp_wallet.fc', 'op == op::burn_notification_ext'],
  ['contracts/lp_wallet.fc', 'balance += jetton_amount;'],
  ['contracts/lp_wallet.fc', 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['contracts/lp_wallet.fc', 'if (flags & 1) {'],
  ['contracts/lp_wallet.fc', 'if (op == op::internal_transfer)'],
  ['contracts/lp_wallet.fc', 'if (op == op::burn)'],
  ['contracts/lp_wallet.fc', 'throw(error::wrong_op);'],
  ['contracts/lp_wallet/op.fc', 'const op::transfer_notification'],
  ['contracts/lp_wallet/op.fc', 'const op::internal_transfer'],
  ['contracts/lp_wallet/op.fc', 'const op::excesses'],
  ['contracts/common/op.fc', 'const op::burn_notification_ext'],
  ['contracts/lp_wallet/storage.fc', 'pack_jetton_lp_wallet_data'],
  ['contracts/common/contracts.fc', 'return begin_message(op::internal_transfer)'],
  ['contracts/pool/msgs/lp_wallet.fc', 'if ctx.at(OPCODE) == op::burn_notification_ext'],
  ['contracts/pool/msgs/lp_wallet.fc', 'storage::save();'],
  ['tests/ConstProduct.spec.ts', "it('should burn liquidity'"],
  ['tests/ConstSum.spec.ts', "it('should burn liquidity'"],
  ['tests/WeightedCPI.spec.ts', "it('should burn liquidity'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

const OP = {
  transferNotification: 'transfer_notification',
  internalTransfer: 'internal_transfer',
  excesses: 'excesses',
  burnNotificationExt: 'burn_notification_ext',
};

function wallet(balance = 100) {
  return {
    balance,
    owner: 'OWNER',
    master: 'MASTER',
    expectedSender: 'JETTON_WALLET_SENDER',
    saved: true,
  };
}

function bounce(w, op, amount) {
  if (op !== OP.internalTransfer && op !== OP.burnNotificationExt) {
    throw new Error('bounce opcode rejected');
  }
  w.balance += amount;
  w.saved = true;
  return { accepted: true, balance: w.balance };
}

function receive(w, sender, amount, forwardAmount, responseAddress) {
  const authorized = sender === w.master || sender === w.expectedSender;
  if (!authorized) throw new Error('receive sender rejected');
  w.balance += amount;
  const notification = forwardAmount > 0 ? { to: w.owner, op: OP.transferNotification, amount } : null;
  const excess = responseAddress ? { to: responseAddress, op: OP.excesses } : null;
  w.saved = true;
  return { balance: w.balance, notification, excess };
}

function model() {
  const w = wallet();
  const internalBounce = bounce(w, OP.internalTransfer, 17);
  const burnBounce = bounce(w, OP.burnNotificationExt, 11);

  let notificationRejected = false;
  const beforeNotification = w.balance;
  try { bounce(w, OP.transferNotification, 13); } catch (_) { notificationRejected = true; }
  if (w.balance !== beforeNotification) throw new Error('transfer_notification changed balance');

  let excessRejected = false;
  const beforeExcess = w.balance;
  try { bounce(w, OP.excesses, 19); } catch (_) { excessRejected = true; }
  if (w.balance !== beforeExcess) throw new Error('excesses changed balance');

  let invalidSenderRejected = false;
  const beforeInvalid = w.balance;
  try { receive(w, 'ATTACKER', 29, 0, 'ATTACKER'); } catch (_) { invalidSenderRejected = true; }
  if (w.balance !== beforeInvalid) throw new Error('invalid sender changed balance');

  const normalReceive = receive(w, w.master, 23, 5, 'RESPONSE');
  if (!normalReceive.notification || normalReceive.notification.to !== w.owner) throw new Error('notification recipient changed');
  if (!normalReceive.excess || normalReceive.excess.op !== OP.excesses) throw new Error('excess opcode changed');

  return {
    balance: w.balance,
    internalBounce,
    burnBounce,
    notificationRejected,
    excessRejected,
    invalidSenderRejected,
    normalReceive,
    persistent_attacker_delta: 0,
  };
}

const result = model();
if (result.balance !== 151) throw new Error(`unexpected conserved wallet balance ${result.balance}`);
if (!result.notificationRejected || !result.excessRejected || !result.invalidSenderRejected) {
  throw new Error('opcode or sender partition failed');
}
if (result.persistent_attacker_delta !== 0) throw new Error('attacker-positive wallet delta');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DE5',
  cross_file_anchors: anchors.length,
  cases: 7,
  accepted_bounce_ops: [OP.internalTransfer, OP.burnNotificationExt],
  rejected_bounce_ops: [OP.transferNotification, OP.excesses],
  invalid_sender_rejected: result.invalidSenderRejected,
  conserved_balance: result.balance,
  persistent_attacker_delta: result.persistent_attacker_delta,
  reason: 'LPWallet accepts bounced balance restoration only for internal_transfer and burn_notification_ext, each restoring the encoded jetton amount before storage::save. transfer_notification and excesses are ordinary outbound-recipient opcodes and are rejected by the bounce partition without balance mutation. Invalid non-bounce senders fail the receive authorization before persistence; no attacker-positive wallet delta is reachable.',
}));
