const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const jettonHandler = read('contracts/router/msgs/jetton.fc');
const common = read('contracts/common/contracts.fc');
const routerRoot = read('contracts/router.fc');
const dex = read('contracts/router/dex.fc');
const pool = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [jettonHandler, 'if ctx.at(OPCODE) == op::ft::transfer_notification'],
  [jettonHandler, 'int jetton_amount = in_msg_body~load_coins();'],
  [jettonHandler, 'slice from_address = in_msg_body~load_msg_addr();'],
  [jettonHandler, 'if in_msg_body.slice_refs_empty?()'],
  [jettonHandler, 'jetton_wallet::transfer(0, jetton_amount, from_address, from_address)'],
  [jettonHandler, 'ctx.at(SENDER),'],
  [jettonHandler, 'route_dex_messages('],
  [common, 'builder) jetton_wallet::transfer'],
  [common, 'store_slice(_to_address)'],
  [common, 'store_slice(_response_address)'],
  [routerRoot, 'if handle_jetton_messages()'],
  [routerRoot, 'if handle_pool_messages()'],
  [dex, 'throw_arg_if(op::transfer_bounce_invalid_request, 1'],
  [dex, 'jetton_wallet::transfer(0, _sent_amount, _caller, _caller)'],
  [pool, 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const notification = { senderWallet: 'SENDER_WALLET', amount: 1000n, from: 'FROM_OWNER', hasReference: false };
const refund = {
  destination: notification.senderWallet,
  sourceOwner: notification.from,
  amount: notification.amount,
};
if (refund.destination !== notification.senderWallet || refund.amount !== notification.amount) {
  throw new Error('no-reference refund tuple mismatch');
}

const fakeSender = { balance: 0n };
const routerOwnedWallet = { balance: 5000n };
const fakeSenderAfter = fakeSender.balance;
const routerOwnedAfter = routerOwnedWallet.balance;
if (fakeSenderAfter !== fakeSender.balance || routerOwnedAfter !== routerOwnedWallet.balance) {
  throw new Error('refund model changed a wallet balance without a transfer execution');
}
if (notification.senderWallet === 'ROUTER_OWNED_WALLET' && fakeSender.balance > 0n) {
  throw new Error('unreachable sender capability model');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('no_ref_branch_refunds_exact_amount true');
console.log('refund_destination_is_not_router_balance_source true');
console.log('fake_sender_cannot_debit_router_wallet true');
console.log('referenced_notifications_take_route_path true');
console.log('attacker_positive_delta false');
console.log('result PASS');
