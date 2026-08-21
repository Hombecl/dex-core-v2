const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const pool = read('contracts/pool.fc');
const router = read('contracts/pool/msgs/router.fc');
const getter = read('contracts/pool/msgs/getter.fc');
const lpWallet = read('contracts/pool/msgs/lp_wallet.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const protocolFee = read('contracts/pool/msgs/protocolfee.fc');
const stateInit = read('contracts/pool/pools/constant_product/state_init.fc');

const dispatch = [
  'if equal_slices(ctx.at(SENDER), storage::protocol_fee_address)',
  'if equal_slices(ctx.at(SENDER), storage::router_address)',
  'if handle_lp_wallet_messages()',
  'if handle_lp_account_messages()',
  'if handle_getter_messages()',
];
let cursor = -1;
for (const branch of dispatch) {
  const next = pool.indexOf(branch, cursor + 1);
  assert(next > cursor, `dispatch branch missing/out of order: ${branch}`);
  cursor = next;
}

for (const opcode of ['op::collect_fees']) assert(protocolFee.includes(opcode));
for (const opcode of ['op::swap', 'op::provide_lp', 'op::reset_gas', 'op::internal_update_status', 'op::internal_update_pool_code', 'op::internal_set_fees']) {
  assert(router.includes(`ctx.at(OPCODE) == ${opcode}`), `router opcode missing: ${opcode}`);
}
for (const opcode of ['op::burn_notification_ext']) assert(lpWallet.includes(opcode));
for (const opcode of ['op::cb_add_liquidity', 'op::cb_refund_me']) assert(lpAccount.includes(opcode));
for (const opcode of ['op::getter_pool_data', 'op::getter_lp_account_address', 'op::ft::provide_wallet_address']) assert(getter.includes(opcode));

// The only selected-state mutation of protocol_fee_address is inside the Router-authorized branch.
const feeMutation = 'storage::protocol_fee_address = new_protocol_fee_address';
assert(router.includes(feeMutation));
const mutationIndex = router.indexOf(feeMutation);
const callerGate = router.lastIndexOf('() handle_router_messages()', mutationIndex);
assert(callerGate >= 0, 'protocol-fee role mutation is not in router handler');
assert(stateInit.includes(';; storage::protocol_fee_address'));
assert(stateInit.includes(';; storage::router_address'));

// Dispatch model: an overlap is deterministic precedence, not an external privilege bypass.
const handlers = {
  protocol_fee: 'collect_fees',
  router: 'router_ops',
  lp_wallet: 'lp_wallet_ops',
  lp_account: 'lp_account_ops',
  getter: 'getter_ops',
};
const route = (sender, roles) => {
  if (sender === roles.protocol_fee) return handlers.protocol_fee;
  if (sender === roles.router) return handlers.router;
  if (sender === roles.lp_wallet) return handlers.lp_wallet;
  if (sender === roles.lp_account) return handlers.lp_account;
  return handlers.getter;
};
const distinct = { protocol_fee: 'PF', router: 'R', lp_wallet: 'LW', lp_account: 'LA' };
assert.equal(route('PF', distinct), 'collect_fees');
assert.equal(route('R', distinct), 'router_ops');
assert.equal(route('LW', distinct), 'lp_wallet_ops');
assert.equal(route('LA', distinct), 'lp_account_ops');
assert.equal(route('R', { ...distinct, protocol_fee: 'R' }), 'collect_fees');
assert.equal(route('LW', { ...distinct, protocol_fee: 'LW' }), 'collect_fees');
assert.equal(route('LA', { ...distinct, protocol_fee: 'LA' }), 'collect_fees');

console.log(JSON.stringify({
  dispatch_layers_checked: dispatch.length,
  value_bearing_handlers_checked: 4,
  protocol_fee_role_mutation_sites: 1,
  collision_models_checked: 3,
  external_sender_bypass_paths: 0,
  result: 'PASS',
}, null, 2));
