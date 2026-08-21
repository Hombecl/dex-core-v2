const assert = require('node:assert/strict');
const fs = require('node:fs');

const wallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet.fc',
  'utf8',
);
const walletUtils = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet/jetton-utils.fc',
  'utf8',
);
const poolLpWallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_wallet.fc',
  'utf8',
);
const poolLpAccount = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_account.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);
const routerDex = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/dex.fc',
  'utf8',
);

assert.match(wallet, /send_raw_message\(msg\.end_cell\(\), 64\);\s*storage::save\(balance, owner_address, jetton_master_address, jetton_wallet_code\);/s);
assert.match(wallet, /\(\) on_bounce \(slice in_msg_body\) impure \{\s*in_msg_body~skip_bits\(32\);/s);
assert.match(wallet, /throw_unless\(709, \(op == op::internal_transfer\) \| \(op == op::burn_notification_ext\)\)/);
assert.match(wallet, /int query_id = in_msg_body~load_uint\(64\);\s*int jetton_amount = in_msg_body~load_coins\(\);\s*balance \+= jetton_amount;/s);
assert.match(wallet, /slice cs = in_msg_full\.begin_parse\(\);\s*int flags = cs~load_uint\(4\);\s*if \(flags & 1\)/s);
assert.match(wallet, /if \(op == op::internal_transfer\) \{\s*receive_tokens\(in_msg_body, sender_address,/s);
assert.match(wallet, /if \(op == op::burn\) \{\s*burn_tokens\(in_msg_body, sender_address,/s);
assert.match(walletUtils, /cell calculate_jetton_lp_wallet_state_init\(slice owner_address, slice jetton_master_address, cell jetton_wallet_code\)/);
assert.match(poolLpWallet, /lp_wallet_idata\(\s*from_address,\s*my_address\(\),\s*storage::jetton_lp_wallet_code\s*\)/s);
assert.match(poolLpAccount, /msgs::send_with_stateinit\(\s*0,\s*lp_wallet~address\(params::workchain\)/s);
assert.match(contracts, /jetton_wallet::mint\(/);
assert.match(routerDex, /send_with_stateinit\(/);

function debit(state, amount, op, outboundId) {
  assert(amount > 0n && amount <= state.balance);
  assert(op === 'internal_transfer' || op === 'burn_notification_ext');
  return {
    state: { ...state, balance: state.balance - amount },
    outbound: { id: outboundId, op, amount, consumed: false },
  };
}

function protocolBounce(state, bounce, header) {
  assert.equal(header, 'protocol_bounced');
  assert(bounce.op === 'internal_transfer' || bounce.op === 'burn_notification_ext');
  assert.equal(bounce.consumed, false);
  return {
    state: { ...state, balance: state.balance + bounce.amount },
    bounce: { ...bounce, consumed: true },
  };
}

function directInbound(state, header, body) {
  if (header !== 'protocol_bounced') return { state, handled: false };
  return protocolBounce(state, { ...body, consumed: false }, header);
}

const base = { balance: 100n, owner: 'POOL', master: 'LP_MASTER' };
const transfer = debit(base, 40n, 'internal_transfer', 'q1');
assert.equal(transfer.state.balance, 60n);
const transferBounce = protocolBounce(transfer.state, transfer.outbound, 'protocol_bounced');
assert.equal(transferBounce.state.balance, base.balance);
assert.equal(transferBounce.bounce.consumed, true);

const burn = debit(base, 35n, 'burn_notification_ext', 'q2');
const burnBounce = protocolBounce(burn.state, burn.outbound, 'protocol_bounced');
assert.equal(burnBounce.state.balance, base.balance);

assert.throws(() => protocolBounce(base, { id: 'fake', op: 'transfer', amount: 100n, consumed: false }, 'protocol_bounced'), /internal_transfer/);
assert.equal(directInbound(base, 'normal', { id: 'fake', op: 'internal_transfer', amount: 100n }).handled, false);
assert.throws(() => protocolBounce(transferBounce.state, transferBounce.bounce, 'protocol_bounced'), /false/);
assert.equal(transfer.state.balance + transfer.outbound.amount, base.balance);
assert.equal(burn.state.balance + burn.outbound.amount, base.balance);

console.log('AF1 bounce-header edge check passed: only protocol-bounced messages enter on_bounce, allowed bodies restore exactly one prior outbound amount, invalid opcodes are rejected, and a replayed bounce is consumed in the model');
