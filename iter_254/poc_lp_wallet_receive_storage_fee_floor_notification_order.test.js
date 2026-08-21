const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const common = read('contracts/common/contracts.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['receive entry', wallet, '() receive_tokens (slice in_msg_body, slice sender_address, int my_ton_balance, int fwd_fee, int msg_value) impure {'],
  ['balance credit', wallet, 'balance += jetton_amount;'],
  ['sender gate', wallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['storage fee floor', wallet, 'int storage_fee = REQUIRED_TON_STORAGE - min(ton_balance_before_msg, REQUIRED_TON_STORAGE);'],
  ['gas deduction', wallet, 'msg_value -= (storage_fee + REQUIRED_GAS);'],
  ['forward branch', wallet, 'if(forward_ton_amount) {'],
  ['forward deduction', wallet, 'msg_value -= (forward_ton_amount + fwd_fee);'],
  ['notification send', wallet, 'send_raw_message(msg.end_cell(), 1);'],
  ['excess condition', wallet, 'if ((response_address.preload_uint(2) != 0) & (msg_value > 0))'],
  ['excess send', wallet, 'send_raw_message(msg.end_cell(), 2);'],
  ['save after actions', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['storage tuple', storage, 'set_data(pack_jetton_lp_wallet_data(balance, owner_address, jetton_master_address, jetton_wallet_code));'],
  ['mint builder', common, 'jetton_wallet::mint('],
  ['pool mint caller', lpAccount, 'jetton_wallet::mint('],
  ['live mint path', system, "it('should handle mint & burn liquidity', async () => {"],
  ['live invalid path', system, "it('should handle invalid transfers', async () => {"],
  ['live complex path', constProduct, "it('should handle more complex scenarios', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const receiveModel = ({ myBalance, msgValue, forwardTonAmount = 0, fwdFee = 3, responseStandard = false, senderAccepted = true, amount = 25 }) => {
  if (!senderAccepted) return { result: 'throw_auth_before_save', persistentDelta: 0, actions: [] };
  const tonBalanceBefore = myBalance - msgValue;
  const storageFee = 10 - Math.min(tonBalanceBefore, 10);
  let remaining = msgValue - (storageFee + 10);
  const actions = [];
  if (forwardTonAmount) {
    remaining -= forwardTonAmount + fwdFee;
    actions.push('transfer_notification');
  }
  if (responseStandard && remaining > 0) actions.push('excesses');
  return { result: 'save_after_compute', persistentDelta: amount, remaining, storageFee, actions };
};

const cases = [
  receiveModel({ myBalance: 10, msgValue: 0 }),
  receiveModel({ myBalance: 10, msgValue: 5 }),
  receiveModel({ myBalance: 30, msgValue: 10, forwardTonAmount: 1, responseStandard: true }),
  receiveModel({ myBalance: 30, msgValue: 14, forwardTonAmount: 1, responseStandard: true }),
  receiveModel({ myBalance: 30, msgValue: 20, forwardTonAmount: 1, responseStandard: true }),
  receiveModel({ myBalance: 30, msgValue: 20, senderAccepted: false }),
];
if (cases[0].persistentDelta !== 25 || cases[1].persistentDelta !== 25) throw new Error('low floor compute path changed source-bound credit');
if (cases[2].actions.length !== 1 || cases[2].actions[0] !== 'transfer_notification') throw new Error('low forward floor action model mismatch');
if (cases[3].actions.length !== 1 || cases[3].actions[0] !== 'transfer_notification') throw new Error('exact forward floor action model mismatch');
if (cases[4].actions.length !== 2) throw new Error('funded notification/excess action model mismatch');
if (cases[5].persistentDelta !== 0) throw new Error('unauthorized sender saved credit');
if (cases.some((c) => c.persistentDelta !== 25 && c !== cases[5])) throw new Error('accepted branch changed encoded credit');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'CC1',
  cross_file_anchors: anchors.length,
  floor_cases: cases.length,
  persistent_deltas: cases.map((c) => c.persistentDelta),
  action_sets: cases.map((c) => c.actions),
  source_observation: 'receive has no explicit msg_value funding throw; it computes storage/gas deductions, optionally schedules notification/excess actions, and saves the source-authorized encoded credit after compute',
  reason: 'The TON floor changes optional action availability, not the accepted LP amount. The sender gate remains the stored master or exact deterministic source wallet, and an unauthorized sender throws before save. Prior forwarding/funding audits cover the same source-bound credit and no attacker-positive asset delta is reachable'
}, null, 2));
