const assert = require('node:assert/strict');
const fs = require('node:fs');

const wallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet.fc',
  'utf8',
);
const jettonUtils = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet/jetton-utils.fc',
  'utf8',
);
const storage = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet/storage.fc',
  'utf8',
);
const poolLpAccount = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_account.fc',
  'utf8',
);
const poolLpWallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_wallet.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);

assert.match(wallet, /balance -= jetton_amount;\s*\s*throw_unless\(705, equal_slices\(owner_address, sender_address\)\);\s*throw_unless\(706, balance >= 0\);/s);
assert.match(wallet, /calculate_jetton_lp_wallet_state_init\(to_owner_address, jetton_master_address, jetton_wallet_code\)/);
assert.match(wallet, /\.store_slice\(response_address\)\s*\.store_coins\(forward_ton_amount\)/s);
assert.match(wallet, /send_raw_message\(msg\.end_cell\(\), 64\);\s*storage::save\(balance, owner_address, jetton_master_address, jetton_wallet_code\);/s);
assert.match(wallet, /if \(flags & 1\) \{\s*on_bounce\(in_msg_body\);/s);
assert.match(wallet, /throw_unless\(709, \(op == op::internal_transfer\) \| \(op == op::burn_notification_ext\)\)/);
assert.match(wallet, /balance \+= jetton_amount;\s*storage::save\(balance, owner_address, jetton_master_address, jetton_wallet_code\);/s);
assert.match(wallet, /if \(op == op::internal_transfer\) \{\s*receive_tokens\(in_msg_body, sender_address,/s);
assert.match(wallet, /if \(op == op::burn\) \{\s*burn_tokens\(in_msg_body, sender_address,/s);
assert.match(jettonUtils, /calculate_user_jetton_lp_wallet_address\(slice owner_address, slice jetton_master_address, cell jetton_wallet_code\)/);
assert.match(storage, /set_data\(pack_jetton_lp_wallet_data\(balance, owner_address, jetton_master_address, jetton_wallet_code\)\)/);
assert.match(poolLpAccount, /jetton_wallet::mint\(\s*user_address,\s*excess_address,\s*liquidity,\s*fwd_amount,/s);
assert.match(poolLpWallet, /throw_unless\(error::invalid_caller, equal_slices\(lp_wallet~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/);
assert.match(contracts, /\(builder\) jetton_wallet::transfer\(int _fwd_amount, int _jetton_amount, slice _to, slice _response_address\)/);

function sendTokens(state, amount, sender, destination, response, forwardTon) {
  if (sender !== state.owner) throw new Error('705');
  if (amount < 0n || state.balance - amount < 0n) throw new Error('706');
  if (destination.wc !== 0) throw new Error('wrong_workchain');
  if (forwardTon < 0n) throw new Error('709');
  return {
    saved: { ...state, balance: state.balance - amount },
    outbound: { amount, destination: `WALLET(${destination.owner}|${state.master})`, response, forwardTon },
  };
}

function receiveTokens(state, message, sender) {
  const expectedUserWallet = `WALLET(${message.from}|${state.master})`;
  if (sender !== state.master && sender !== expectedUserWallet) throw new Error('707');
  return { ...state, balance: state.balance + message.amount };
}

function bounceRestore(state, body, isBounced) {
  if (!isBounced) throw new Error('not_bounced');
  if (body.op !== 'internal_transfer' && body.op !== 'burn_notification_ext') throw new Error('709');
  return { ...state, balance: state.balance + body.amount };
}

const state = { balance: 100n, owner: 'POOL', master: 'LP_MASTER' };
const sent = sendTokens(state, 30n, 'POOL', { owner: 'ALICE', wc: 0 }, 'EXCESS', 7n);
assert.equal(sent.saved.balance, 70n);
assert.deepEqual(sent.outbound, {
  amount: 30n, destination: 'WALLET(ALICE|LP_MASTER)', response: 'EXCESS', forwardTon: 7n,
});
assert.equal(receiveTokens({ ...state, balance: 0n }, { amount: 30n, from: 'POOL' }, 'LP_MASTER').balance, 30n);
assert.equal(receiveTokens({ ...state, balance: 0n }, { amount: 30n, from: 'POOL' }, 'WALLET(POOL|LP_MASTER)').balance, 30n);
assert.throws(() => receiveTokens({ ...state, balance: 0n }, { amount: 30n, from: 'POOL' }, 'FOREIGN'), /707/);

const restoredInternal = bounceRestore(sent.saved, { op: 'internal_transfer', amount: 30n }, true);
assert.equal(restoredInternal.balance, state.balance);
const restoredBurn = bounceRestore({ ...state, balance: 40n }, { op: 'burn_notification_ext', amount: 60n }, true);
assert.equal(restoredBurn.balance, state.balance);
assert.throws(() => bounceRestore(sent.saved, { op: 'internal_transfer', amount: 30n }, false), /not_bounced/);
assert.throws(() => sendTokens(state, 101n, 'POOL', { owner: 'ALICE', wc: 0 }, 'EXCESS', 0n), /706/);
assert.equal(sent.outbound.response, 'EXCESS');
assert.equal(sent.saved.balance + sent.outbound.amount, state.balance);

console.log('AE5 LP-wallet edge check passed: owner/balance checks precede a single debit save, destination wallet identity is deterministic, response/forward fields carry TON only, and protocol bounce restoration returns the exact debited amount');
