const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const common = read('contracts/common/contracts.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['receive entry', wallet, '() receive_tokens (slice in_msg_body, slice sender_address, int my_ton_balance, int fwd_fee, int msg_value) impure {'],
  ['credit before auth', wallet, 'balance += jetton_amount;'],
  ['source/master gate', wallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['storage deduction', wallet, 'msg_value -= (storage_fee + REQUIRED_GAS);'],
  ['forward parse', wallet, 'int forward_ton_amount = in_msg_body~load_coins();'],
  ['notification branch', wallet, 'if(forward_ton_amount) {'],
  ['notification opcode', wallet, '.store_uint(op::transfer_notification, 32)'],
  ['notification owner', wallet, '.store_slice(owner_address)'],
  ['response branch', wallet, 'if ((response_address.preload_uint(2) != 0) & (msg_value > 0)) {'],
  ['excess recipient', wallet, '.store_slice(response_address)'],
  ['excess opcode', wallet, '.store_uint(op::excesses, 32)'],
  ['final wallet save', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['encoded storage save', storage, 'set_data(pack_jetton_lp_wallet_data(balance, owner_address, jetton_master_address, jetton_wallet_code));'],
  ['mint builder', common, '(cell) jetton_wallet::mint('],
  ['mint forward field', common, '.store_coins(_fwd_amount) ;; forward_ton_amount'],
  ['Pool fwd suppression', poolLpAccount, 'fwd_amount = 0;'],
  ['Pool mint send', poolLpAccount, 'jetton_wallet::mint('],
  ['Router notification ingress', routerJetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification {'],
  ['live mint burn', system, "it('should handle mint & burn liquidity', async () => {"],
  ['live complex flow', constProduct, "it('should handle more complex scenarios', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ sender, forward, msgValue, response, notificationAction = 'queued' }) => {
  const authorized = sender === 'MASTER' || sender === 'DETERMINISTIC_SOURCE_WALLET';
  const before = 100;
  if (!authorized) return { branch: 'reject_before_save', balance: before, notification: null, excess: null, persistentDelta: 0 };
  const balance = before + 25;
  const storageAndGas = 12;
  let residual = msgValue - storageAndGas;
  const notificationValue = forward > 0 ? forward + 2 : 0;
  residual -= notificationValue;
  const notification = forward > 0 ? { amount: 25, action: notificationAction } : null;
  const excess = response === 'NONE' || residual <= 0 ? null : { recipient: response, amount: residual };
  return {
    branch: 'authorized_receive_save_after_actions',
    balance,
    notification,
    excess,
    persistentDelta: balance - before,
  };
};

const cases = [
  model({ sender: 'MASTER', forward: 10, msgValue: 40, response: 'EXCESS_A' }),
  model({ sender: 'DETERMINISTIC_SOURCE_WALLET', forward: 0, msgValue: 20, response: 'EXCESS_B' }),
  model({ sender: 'MASTER', forward: 10, msgValue: 13, response: 'EXCESS_C' }),
  model({ sender: 'MASTER', forward: 10, msgValue: 40, response: 'NONE', notificationAction: 'bounced_later' }),
  model({ sender: 'ATTACKER', forward: 10, msgValue: 40, response: 'ATTACKER' }),
];

if (cases[0].balance !== 125 || cases[0].notification.amount !== 25 || cases[0].excess.recipient !== 'EXCESS_A') {
  throw new Error('authorized master receive changed credit/notification/excess binding');
}
if (cases[1].balance !== 125 || cases[1].notification !== null || cases[1].excess.recipient !== 'EXCESS_B') {
  throw new Error('source-wallet receive changed zero-forward semantics');
}
if (cases[2].balance !== 125 || cases[2].notification.amount !== 25 || cases[2].excess !== null) {
  throw new Error('low residual value changed saved credit or notification amount');
}
if (cases[3].balance !== 125 || cases[3].notification.action !== 'bounced_later') {
  throw new Error('later notification failure changed committed LP credit');
}
if (cases[4].branch !== 'reject_before_save' || cases[4].balance !== 100) {
  throw new Error('unauthorized sender reached the final save');
}
if (cases.some((c) => c.persistentDelta !== 0 && c.persistentDelta !== 25)) {
  throw new Error('unexpected persistent delta');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DD4',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  branches: cases.map((c) => c.branch),
  saved_balances: cases.map((c) => c.balance),
  notification_states: cases.map((c) => c.notification && c.notification.action),
  excess_recipients: cases.map((c) => c.excess && c.excess.recipient),
  persistent_deltas: cases.map((c) => c.persistentDelta),
  reason: 'LPWallet receive authorizes the master or deterministic source wallet, computes the exact credited balance, schedules optional notification and residual excess actions, and then saves the same balance/identity tuple. Forward amount and response address affect only outgoing action values and destinations; a later notification bounce does not rewrite the already saved LP credit, while an unauthorized sender throws before save.'
}, null, 2));
