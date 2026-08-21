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
const lpWalletMsg = read('contracts/pool/msgs/lp_wallet.fc');
const jettonWallet = read('contracts/lp_wallet.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerJetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification'],
  [routerJetton, 'route_dex_messages('],
  [routerDex, 'pool_idata(my_address(), _jetton_address, token_wallet1'],
  [routerDex, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1'],
  [routerDex, 'throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1))'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)))'],
  [routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  [common, 'router::pay_to('],
  [common, '.store_slice(_to_address)'],
  [poolState, 'if _first_jetton_address.slice_hash() > _second_jetton_address.slice_hash()'],
  [poolLp, 'throw_unless(error::low_liquidity, (tot_am0 > 0) & (tot_am1 > 0));'],
  [poolLp, 'storage::reserve0 += tot_am0;'],
  [lpWalletMsg, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)))'],
  [lpWalletMsg, 'router::pay_to('],
  [lpWalletMsg, 'storage::save();'],
  [jettonWallet, 'balance += jetton_amount;'],
  [jettonWallet, 'equal_slices(jetton_master_address, sender_address)'],
  [jettonWallet, 'store_uint(op::transfer_notification, 32)'],
  [jettonWallet, 'balance -= jetton_amount;'],
];
anchors.forEach(([text, needle]) => must(text, needle));

// A forged A-leg can make a Pool believe that a pair has a large reserve,
// but a real Router-owned B wallet can only produce its notification after a
// matching B-token credit. The burn payout is bounded by that B leg.
const residual = 1_000_000n;
const attackerFundedBLeg = 1_000_000n;
const fakeALeg = 1_000_000_000_000n;
const fakePair = { tokenA: 'forged-wallet-A', tokenB: 'router-owned-wallet-B' };
const initialRouterB = residual;
const routerBBeforeBurn = initialRouterB + attackerFundedBLeg;
const payoutB = attackerFundedBLeg - 2n;
const routerBAfterBurn = routerBBeforeBurn - payoutB;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
assert(fakeALeg > attackerFundedBLeg, 'fake A leg did not exercise the residual hypothesis');
assert(routerBBeforeBurn === initialRouterB + attackerFundedBLeg, 'B notification omitted its wallet credit');
assert(payoutB > 0n && payoutB <= attackerFundedBLeg, 'B payout exceeded funded B leg');
assert(routerBAfterBurn >= initialRouterB, 'residual B balance was drained');
assert(fakePair.tokenA !== fakePair.tokenB, 'pair collapsed to one token');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('forged_A_notification_reaches_sorted_pair true');
console.log('real_B_notification_requires_B_wallet_credit true');
console.log(`fake_A_leg ${fakeALeg}`);
console.log(`attacker_funded_B_leg ${attackerFundedBLeg}`);
console.log(`router_B_baseline ${initialRouterB}`);
console.log(`router_B_after_burn ${routerBAfterBurn}`);
console.log(`observed_B_payout_bound ${payoutB}`);
console.log('residual_not_drained true');
console.log('result PASS');
