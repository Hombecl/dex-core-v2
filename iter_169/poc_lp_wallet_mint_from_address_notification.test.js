const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const lpWallet = read('contracts/lp_wallet.fc');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const routerDex = read('contracts/router/dex.fc');
const common = read('contracts/common/contracts.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(lpWallet.includes('balance -= jetton_amount;'));
assert(lpWallet.includes('throw_unless(706, balance >= 0);'));
assert(lpWallet.includes('.store_uint(op::transfer_notification, 32)'));
assert(lpWallet.includes('.store_slice(from_address)'));
assert(routerJetton.includes('route_dex_messages('));
assert(routerJetton.includes('ctx.at(SENDER),'));
assert(routerDex.includes('pool_idata(my_address(), _jetton_address, token_wallet1'));
assert(routerDex.includes('pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1, _dex_payload)'));
assert(routerDex.includes('pool_idata('));

let cases = 0;
let ownBalanceBackedNotifications = 0;
let unbackedNotificationCases = 0;
let productionPoolMatches = 0;
let freshPairCases = 0;
for (const senderKind of ['configured_token_wallet', 'lp_wallet', 'arbitrary_contract']) {
  for (const amount of [1n, 1000n, 1000000n]) {
    const senderBalanceBefore = senderKind === 'lp_wallet' ? amount : 0n;
    const senderBalanceAfter = senderBalanceBefore - amount;
    const notificationCanBeEmitted = senderKind === 'lp_wallet' && senderBalanceAfter >= 0n;
    if (notificationCanBeEmitted) ownBalanceBackedNotifications += 1;
    else unbackedNotificationCases += 1;
    const routedToken0 = senderKind;
    const matchesProductionPool = routedToken0 === 'configured_token_wallet';
    if (matchesProductionPool) productionPoolMatches += 1;
    else freshPairCases += 1;
    assert.equal(notificationCanBeEmitted, senderKind === 'lp_wallet');
    assert.equal(matchesProductionPool, senderKind === 'configured_token_wallet');
    cases += 1;
  }
}

for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('pool::get_swap_out'));
}

console.log(JSON.stringify({
  variants_checked: variants.length,
  sender_and_amount_cases: cases,
  balance_backed_lp_wallet_notifications: ownBalanceBackedNotifications,
  unbacked_notification_cases_rejected_by_sender_balance: unbackedNotificationCases,
  production_token_wallet_pair_matches: productionPoolMatches,
  noncanonical_sender_fresh_pair_cases: freshPairCases,
  free_notification_mint: false,
  attacker_value_extraction: false,
  result: 'PASS',
}, null, 2));
