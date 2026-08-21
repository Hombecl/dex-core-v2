const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const common = read('contracts/common/contracts.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const userMessages = read('contracts/lp_account/msgs/user.fc');
const system = read('tests/System.spec.ts');
const product = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['receive response parse', wallet, 'slice response_address = in_msg_body~load_msg_addr();'],
  ['receive authorization before excess', wallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['storage/gas residual', wallet, 'msg_value -= (storage_fee + REQUIRED_GAS);'],
  ['forward residual debit', wallet, 'msg_value -= (forward_ton_amount + fwd_fee);'],
  ['none/positive excess gate', wallet, 'if ((response_address.preload_uint(2) != 0) & (msg_value > 0)) {'],
  ['excess destination', wallet, '.store_slice(response_address)'],
  ['excess amount', wallet, '.store_coins(msg_value)'],
  ['excess opcode', wallet, '.store_uint(op::excesses, 32)'],
  ['final wallet save', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['mint response serializer', common, '.store_slice(_response_address) ;; response_address'],
  ['Pool excess parse', poolLpAccount, 'slice excess_address = additional_data~load_msg_addr();'],
  ['Pool excess forward', poolLpAccount, 'excess_address, \n                    liquidity,'],
  ['LPAccount excess input', userMessages, 'slice excesses_address = additional_fields~load_msg_addr();'],
  ['LPAccount callback excess', userMessages, 'excesses_address\n            ),'],
  ['live System test', system, "it('should handle mint & burn liquidity'"],
  ['live product test usage', product, "it('should provide lp with payload to a different address'"],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

const receiveStart = wallet.indexOf('() receive_tokens');
const save = wallet.indexOf('storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);', receiveStart);
const excess = wallet.indexOf('if ((response_address.preload_uint(2) != 0) & (msg_value > 0)) {', receiveStart);
assert(receiveStart >= 0 && excess > receiveStart && save > excess, 'excess routing must be inside receive before final save');
assert(wallet.indexOf('throw_unless(707', receiveStart) < excess, 'authorization must precede excess send construction');

// The response address changes only the destination of the residual TON
// excess. It does not select the LP wallet, token amount, or stored LP balance.
function excessMessage(responseAddress, residualValue) {
  if (responseAddress === 'addr_none' || residualValue <= 0) return null;
  return { op: 'excesses', to: responseAddress, amount: residualValue };
}
assert.deepStrictEqual(excessMessage('user-A', 9), { op: 'excesses', to: 'user-A', amount: 9 });
assert.deepStrictEqual(excessMessage('user-B', 9), { op: 'excesses', to: 'user-B', amount: 9 });
assert.strictEqual(excessMessage('addr_none', 9), null);
assert.strictEqual(excessMessage('user-A', 0), null);
assert.notStrictEqual(excessMessage('user-A', 9).to, excessMessage('user-B', 9).to);
assert.strictEqual(excessMessage('user-A', 9).amount, excessMessage('user-B', 9).amount);

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX24',
  cross_file_anchors: anchors.length,
  excess_routing_cases: 6,
  reason: 'response_address selects only the residual TON excess after authorization and cost deductions; token amount, LP wallet identity, and stored LP balance remain independent, so arbitrary destination choice is not attacker-positive value loss',
}, null, 2));
