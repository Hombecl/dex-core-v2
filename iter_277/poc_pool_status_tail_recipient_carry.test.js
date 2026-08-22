const assert = require('node:assert/strict');

function getExcessesAddress(address, sender, workchain = 0) {
  const chosen = address === null ? sender : address;
  if (chosen.workchain !== workchain) throw new Error('wrong_workchain');
  return chosen;
}

function routerUpdatePoolStatus({ senderRole, wallet0, wallet1, excessesRecipient, hasTail }) {
  if (senderRole !== 'admin') return { branch: 'router_admin_reject', poolMessage: null };
  if (hasTail) return { branch: 'router_end_parse_reject', poolMessage: null };
  const recipient = getExcessesAddress(excessesRecipient, { id: 'ADMIN', workchain: 0 });
  if (wallet0.workchain !== 0 || wallet1.workchain !== 0) throw new Error('wrong_workchain');
  return { branch: 'router_to_pool', poolMessage: { senderRole: 'router', recipient } };
}

function poolInternalUpdateStatus({ senderRole, recipient, locked }) {
  if (senderRole !== 'router') return { branch: 'pool_sender_reject', locked, outbound: null, tokenDelta: 0n };
  const nextLocked = !locked;
  return { branch: 'pool_toggle_save_and_excess', locked: nextLocked, outbound: recipient, tokenDelta: 0n };
}

const admin = { id: 'ADMIN', workchain: 0 };
const beneficiary = { id: 'ADMIN_SELECTED_BENEFICIARY', workchain: 0 };
const wallet0 = { id: 'TOKEN0_WALLET', workchain: 0 };
const wallet1 = { id: 'TOKEN1_WALLET', workchain: 0 };

const normal = routerUpdatePoolStatus({ senderRole: 'admin', wallet0, wallet1, excessesRecipient: null, hasTail: false });
assert.equal(normal.branch, 'router_to_pool');
const normalPool = poolInternalUpdateStatus({ ...normal.poolMessage, locked: false });
assert.equal(normalPool.branch, 'pool_toggle_save_and_excess');
assert.equal(normalPool.outbound.id, admin.id);
assert.equal(normalPool.tokenDelta, 0n);

const explicit = routerUpdatePoolStatus({ senderRole: 'admin', wallet0, wallet1, excessesRecipient: beneficiary, hasTail: false });
const explicitPool = poolInternalUpdateStatus({ ...explicit.poolMessage, locked: true });
assert.equal(explicitPool.outbound.id, beneficiary.id);
assert.equal(explicitPool.tokenDelta, 0n);

assert.equal(routerUpdatePoolStatus({ senderRole: 'outsider', wallet0, wallet1, excessesRecipient: beneficiary, hasTail: false }).poolMessage, null);
assert.equal(routerUpdatePoolStatus({ senderRole: 'admin', wallet0, wallet1, excessesRecipient: beneficiary, hasTail: true }).poolMessage, null);
assert.throws(() => routerUpdatePoolStatus({ senderRole: 'admin', wallet0: { ...wallet0, workchain: 1 }, wallet1, excessesRecipient: beneficiary, hasTail: false }), /wrong_workchain/);
const direct = poolInternalUpdateStatus({ senderRole: 'outsider', recipient: beneficiary, locked: false });
assert.equal(direct.branch, 'pool_sender_reject');
assert.equal(direct.tokenDelta, 0n);

console.log('PASS 6 status/recipient cases; external attacker delta = 0; recipient selection is admin-controlled TON carry only');
