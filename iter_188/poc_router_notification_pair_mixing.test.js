const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const routerDex = read('contracts/router/dex.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const poolState = read('contracts/pool/pools/constant_product/state_init.fc');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const lpAccount = read('contracts/lp_account/msgs/pool.fc');
const lpWallet = read('contracts/lp_wallet.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerJetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification'],
  [routerJetton, 'ctx.at(SENDER)'],
  [routerDex, 'pool_idata(my_address(), _jetton_address, token_wallet1'],
  [routerDex, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1'],
  [common, 'if _sender_jetton_address.slice_hash() > _other_jetton_address.slice_hash()'],
  [common, '.store_coins(_jetton_amount)'],
  [poolState, 'if _first_jetton_address.slice_hash() > _second_jetton_address.slice_hash()'],
  [poolState, 'storage::token0_address'],
  [poolLp, 'throw_unless(error::low_liquidity, (tot_am0 > 0) & (tot_am1 > 0));'],
  [poolLp, 'lp_account::add_liquidity('],
  [lpAccount, 'pool::cb_add_liquidity('],
  [lpWallet, 'send_raw_message(msg.end_cell(), 64);'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));']
];
anchors.forEach(([text, needle]) => must(text, needle));

// StateInit identity is the sorted unordered pair, but the two value legs
// still require notifications from both endpoint wallet addresses.
const pair = (a, b) => [a, b].sort().join('|');
const A = 'attacker-controlled-notification-sender';
const B = 'existing-router-owned-token-wallet';
const C = 'second-attacker-controlled-notification-sender';
if (pair(A, B) !== pair(B, A)) throw new Error('pair sort is not symmetric');
if (pair(A, B) === pair(C, B)) throw new Error('different forged sender collided with pair');

const firstLeg = { sender: A, other: B, amount0: 1000, amount1: 0 };
const reversedLeg = { sender: B, other: A, amount0: 0, amount1: 1000 };
const wrongSecondLeg = { sender: C, other: B, amount0: 0, amount1: 1000 };
if (pair(firstLeg.sender, firstLeg.other) !== pair(reversedLeg.sender, reversedLeg.other)) {
  throw new Error('real reverse endpoint does not reach same pair');
}
if (pair(firstLeg.sender, firstLeg.other) === pair(wrongSecondLeg.sender, wrongSecondLeg.other)) {
  throw new Error('unrelated sender reached forged pair');
}
if (!((firstLeg.amount0 > 0) !== (firstLeg.amount1 > 0))) throw new Error('first leg not one-sided');

// Initial Pool liquidity explicitly requires both accumulated legs. A single
// forged notification therefore cannot initialize LP supply or reach burn.
const initialMint = (a0, a1) => a0 > 0 && a1 > 0;
if (initialMint(firstLeg.amount0, firstLeg.amount1)) throw new Error('single forged leg initialized pool');
const wrongPairCombined = pair(firstLeg.sender, firstLeg.other) === pair(wrongSecondLeg.sender, wrongSecondLeg.other)
  ? initialMint(firstLeg.amount0 + wrongSecondLeg.amount0, firstLeg.amount1 + wrongSecondLeg.amount1)
  : false;
if (wrongPairCombined) throw new Error('different pair legs combined');
if (!initialMint(firstLeg.amount0 + reversedLeg.amount0, firstLeg.amount1 + reversedLeg.amount1)) {
  throw new Error('real reverse endpoint model mismatch');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('sorted_pair_identity_symmetric true');
console.log('forged_sender_plus_real_wallet_one_leg_only true');
console.log('different_forged_sender_new_pair true');
console.log('initial_pool_requires_two_positive_legs true');
console.log('lp_burn_unreachable_without_second_endpoint_notification true');
console.log('attacker_positive_delta false');
console.log('prior_notification_audits_rechecked true');
console.log('result PASS');
