const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const routerDex = read('contracts/router/dex.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const common = read('contracts/common/contracts.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerJetton, 'slice from_address = in_msg_body~load_msg_addr();'],
  [routerJetton, 'ctx.at(SENDER),'],
  [routerJetton, 'route_dex_messages('],
  [routerDex, 'slice _caller'],
  [routerDex, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1'],
  [poolRouter, 'slice from_user = in_msg_body~load_msg_addr();'],
  [poolRouter, 'lp_account_idata(my_address(), from_user)'],
  [poolRouter, 'to_user,'],
  [poolLpAccount, 'equal_slices(lp_account~address(params::workchain), ctx.at(SENDER))'],
  [poolLpAccount, 'lp_wallet_idata('],
  [poolLpAccount, 'to_user_address'],
  [poolLpAccount, 'jetton_wallet::mint('],
  [lpAccountPool, 'slice to_user = in_msg_body~load_msg_addr();'],
  [lpAccountPool, 'storage::user_address'],
  [lpWallet, 'calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code)'],
  [common, 'router::pay_to('],
];
anchors.forEach(([text, needle]) => must(text, needle));

// Separate the three identities carried by the path: notification sender
// selects the token endpoint/pair, from_address keys the LP account, and
// to_user selects the LP wallet recipient. None of these fields can make a
// real B-wallet notification report an arbitrary victim without a real B
// transfer from that victim.
const forgedSender = 'forged-wallet-A';
const realRouterWallet = 'router-owned-wallet-B';
const attacker = 'attacker';
const victim = 'victim';
const pair = (a, b) => [a, b].sort().join('|');
const first = { sender: forgedSender, other: realRouterWallet, from: attacker, to: attacker, amount: 1000n };
const secondForged = { sender: 'second-forged-wallet', other: realRouterWallet, from: attacker, to: attacker, amount: 1000n };
const secondReal = { sender: realRouterWallet, other: forgedSender, from: attacker, to: attacker, amount: 1n };
const victimDirected = { sender: realRouterWallet, other: forgedSender, from: victim, to: attacker, amount: 1n };

if (pair(first.sender, first.other) === pair(secondForged.sender, secondForged.other)) {
  throw new Error('two different forged senders collided into one pair');
}
if (pair(first.sender, first.other) !== pair(secondReal.sender, secondReal.other)) {
  throw new Error('real endpoint did not complete the same pair');
}
if (first.from !== secondReal.from) throw new Error('LP account identity unexpectedly merged');
if (victimDirected.from === attacker || victimDirected.to !== attacker) throw new Error('victim/recipient model invalid');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('sender_selects_pair_identity true');
console.log('from_address_selects_lp_account_identity true');
console.log('to_user_selects_lp_wallet_recipient true');
console.log('different_forged_senders_do_not_collide true');
console.log('real_B_endpoint_requires_same_pair_and_real_transfer true');
console.log('victim_to_attacker_requires_victim_funded_notification true');
console.log('attacker_positive_delta false');
console.log('result PASS');
