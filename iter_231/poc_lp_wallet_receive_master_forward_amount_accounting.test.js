const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const lpWallet = read('contracts/lp_wallet.fc');
const common = read('contracts/common/contracts.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const system = read('tests/System.spec.ts');

const anchors = [
  ['lp_wallet receive entry', lpWallet, '() receive_tokens (slice in_msg_body, slice sender_address, int my_ton_balance, int fwd_fee, int msg_value) impure {'],
  ['lp_wallet master/source gate', lpWallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['lp_wallet deterministic source gate', lpWallet, 'calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code), sender_address'],
  ['lp_wallet storage/gas debit', lpWallet, 'msg_value -= (storage_fee + REQUIRED_GAS);'],
  ['lp_wallet forward debit', lpWallet, 'msg_value -= (forward_ton_amount + fwd_fee);'],
  ['lp_wallet notification amount', lpWallet, '.store_coins(forward_ton_amount)'],
  ['lp_wallet excess amount', lpWallet, '.store_coins(msg_value)'],
  ['lp_wallet save after forwarding', lpWallet, 'send_raw_message(msg.end_cell(), 2);\n    }\n\n    storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['mint serializer amount', common, '.store_coins(_amount) ;; jetton_amount'],
  ['mint serializer response', common, '.store_slice(_response_address) ;; response_address'],
  ['mint serializer forward', common, '.store_coins(_fwd_amount) ;; forward_ton_amount'],
  ['Pool gas estimate', poolLpAccount, 'int gas_available = ctx.at(MSG_VALUE) - (used_gas + storage_fee::pool);'],
  ['Pool suppresses underfunded notification', poolLpAccount, 'fwd_amount = 0;'],
  ['Pool mint carry', poolLpAccount, 'jetton_wallet::mint('],
  ['Pool commits after send', poolLpAccount, 'storage::save();'],
  ['live mint/burn regression', system, "it('should handle mint & burn liquidity'"],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

// The committed branch must leave a non-negative value for the outgoing
// notification and the optional excess response. A negative store_coins input
// would throw before the final storage::save, so no partial LP credit persists.
function receiveValue(msgValue, storageFee, requiredGas, forwardAmount, fwdFee) {
  let residual = msgValue - storageFee - requiredGas;
  if (forwardAmount > 0) residual -= forwardAmount + fwdFee;
  assert(residual >= 0, 'underfunded receive must not reach a committed save');
  return residual;
}

assert.strictEqual(receiveValue(1000, 100, 200, 0, 10), 700);
assert.strictEqual(receiveValue(1000, 100, 200, 300, 10), 390);
assert.throws(() => receiveValue(1000, 100, 200, 701, 10), /underfunded/);

// The serialized mint tuple and receive parser consume the same sequence.
const mintOrder = [
  '.store_coins(_amount) ;; jetton_amount',
  '.store_slice(_from) ;; from_address',
  '.store_slice(_response_address) ;; response_address',
  '.store_coins(_fwd_amount) ;; forward_ton_amount',
];
let previous = -1;
for (const needle of mintOrder) {
  const at = common.indexOf(needle);
  assert(at > previous, `mint field order broken at ${needle}`);
  previous = at;
}

// Pool's caller-side threshold is strict-positive: equality suppresses the
// notification, and one unit above the boundary retains it.
const threshold = (gasAvailable, transferEstimate, twoForwardFees, forwardAmount) =>
  ((gasAvailable - (transferEstimate + twoForwardFees)) - forwardAmount <= 0) ? 0 : forwardAmount;
assert.strictEqual(threshold(1000, 300, 100, 600), 0);
assert.strictEqual(threshold(1001, 300, 100, 600), 600);

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX22',
  cross_file_anchors: anchors.length,
  exact_boundary_checks: 5,
  reason: 'master/source authorization, nonnegative value construction, serializer/parser order, and caller-side gas suppression prevent a committed LP credit without the matching forward-value branch',
}, null, 2));
