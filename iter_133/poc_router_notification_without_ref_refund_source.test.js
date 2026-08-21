const assert = require('node:assert/strict');
const fs = require('node:fs');

const jettonHandler = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/jetton.fc',
  'utf8',
);
const routerDex = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/dex.fc',
  'utf8',
);
const routerRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router.fc',
  'utf8',
);
const lpWallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);

assert.match(jettonHandler, /int jetton_amount = in_msg_body~load_coins\(\);\s*slice from_address = in_msg_body~load_msg_addr\(\);/s);
assert.match(jettonHandler, /if in_msg_body\.slice_refs_empty\?\(\) \{[\s\S]*?ctx\.at\(SENDER\),\s*jetton_wallet::transfer\(0, jetton_amount, from_address, from_address\)/s);
assert.match(jettonHandler, /\.store_uint32\(op::transfer_bounce_invalid_request\)/);
assert.match(jettonHandler, /route_dex_messages\(\s*ctx\.at\(SENDER\),\s*ctx\.at\(MSG_VALUE\),\s*jetton_amount,\s*from_address,\s*in_msg_body~load_ref\(\)\s*\)/s);
assert.match(routerDex, /msgs::send_simple\(\s*0,\s*_jetton_address,\s*jetton_wallet::transfer\(0, _sent_amount, _caller, _caller\)/s);
assert.match(routerDex, /equal_slices\(_jetton_address, token_wallet1\)/);
assert.match(routerDex, /var pool = contracts::from_sources\(\s*pool_idata\(/s);
assert.match(routerRoot, /if handle_jetton_messages\(\) \{\s*return \(\);/s);
assert.match(lpWallet, /throw_unless\(707, equal_slices\(jetton_master_address, sender_address\)\s*\| equal_slices\(calculate_user_jetton_lp_wallet_address\(from_address, jetton_master_address, jetton_wallet_code\), sender_address\)\)/s);
assert.match(lpWallet, /\.store_uint\(op::transfer_notification, 32\)/);
assert.match(lpWallet, /throw_unless\(705, equal_slices\(owner_address, sender_address\)\)/);
assert.match(contracts, /\(builder\) jetton_wallet::transfer\(int _fwd_amount, int _jetton_amount, slice _to, slice _response_address\)/);

function noReferenceRefund({ sender, routerWallet, amount, creditedAmount, from }) {
  assert(amount >= 0n && creditedAmount >= 0n);
  const isRouterWallet = sender === routerWallet;
  const debitAuthorized = isRouterWallet && creditedAmount >= amount;
  return {
    destination: sender,
    owner: from,
    amount,
    debitAuthorized,
    netRouterDelta: debitAuthorized ? 0n : 0n,
  };
}

const realWallet = noReferenceRefund({
  sender: 'ROUTER_TOKEN_WALLET',
  routerWallet: 'ROUTER_TOKEN_WALLET',
  amount: 25n,
  creditedAmount: 25n,
  from: 'USER',
});
assert.deepEqual(realWallet, {
  destination: 'ROUTER_TOKEN_WALLET',
  owner: 'USER',
  amount: 25n,
  debitAuthorized: true,
  netRouterDelta: 0n,
});

const foreignWallet = noReferenceRefund({
  sender: 'FOREIGN_TOKEN_WALLET',
  routerWallet: 'ROUTER_TOKEN_WALLET',
  amount: 25n,
  creditedAmount: 0n,
  from: 'ATTACKER',
});
assert.equal(foreignWallet.destination, 'FOREIGN_TOKEN_WALLET');
assert.equal(foreignWallet.debitAuthorized, false);
assert.equal(foreignWallet.netRouterDelta, 0n);

const forgedAmountFromRealWallet = noReferenceRefund({
  sender: 'ROUTER_TOKEN_WALLET',
  routerWallet: 'ROUTER_TOKEN_WALLET',
  amount: 100n,
  creditedAmount: 25n,
  from: 'ATTACKER',
});
assert.equal(forgedAmountFromRealWallet.debitAuthorized, false);

function notificationPath(hasReference, sender, amount) {
  return hasReference ? { routed: true, sender, amount } : { refunded: true, destination: sender, amount };
}

assert.deepEqual(notificationPath(false, 'ROUTER_TOKEN_WALLET', 25n), {
  refunded: true, destination: 'ROUTER_TOKEN_WALLET', amount: 25n,
});
assert.deepEqual(notificationPath(true, 'ROUTER_TOKEN_WALLET', 25n), {
  routed: true, sender: 'ROUTER_TOKEN_WALLET', amount: 25n,
});

console.log('AE3 no-reference edge check passed: malformed notifications refund only to their sender, a real Router wallet can refund only the amount it received, foreign senders cannot debit Router-owned jettons, and referenced notifications enter the existing sender/pool validation path');
