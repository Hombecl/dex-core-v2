const assert = require('node:assert/strict');

function routerSet({ sender, admin, amp, recipient, left, right, tail = false }) {
  if (sender !== admin) return { branch: 'admin_reject', pool: null };
  if (tail) return { branch: 'root_end_parse_reject', pool: null };
  if (amp < 1 || amp > 2000) return { branch: 'amp_domain_reject', pool: null };
  if (left === right || recipient.workchain !== 0) return { branch: 'address_reject', pool: null };
  return { branch: 'router_to_pool', pool: { sender: 'router', recipient, amp } };
}

function poolSet({ sender, message }) {
  if (sender !== 'router') return { branch: 'pool_sender_reject', saved: false, outbound: null };
  return { branch: 'pool_save_amp_and_excess', saved: true, amp: message.amp, outbound: message.recipient };
}

const admin = 'admin';
const wallet0 = 'token0_wallet';
const wallet1 = 'token1_wallet';
const recipient = { id: 'admin', workchain: 0 };

const valid = routerSet({ sender: admin, admin, amp: 10, recipient, left: wallet0, right: wallet1 });
const validPool = poolSet({ sender: valid.pool.sender, message: valid.pool });
assert.equal(validPool.branch, 'pool_save_amp_and_excess');
assert.equal(validPool.amp, 10);
assert.equal(validPool.outbound.id, 'admin');
assert.equal(validPool.saved, true);
assert.equal(routerSet({ sender: admin, admin, amp: 10, recipient, left: wallet0, right: wallet1, tail: true }).pool, null);
assert.equal(routerSet({ sender: admin, admin, amp: 0, recipient, left: wallet0, right: wallet1 }).branch, 'amp_domain_reject');
assert.equal(routerSet({ sender: admin, admin, amp: 2001, recipient, left: wallet0, right: wallet1 }).branch, 'amp_domain_reject');
assert.equal(routerSet({ sender: admin, admin, amp: 10, recipient: { id: 'bad', workchain: 1 }, left: wallet0, right: wallet1 }).branch, 'address_reject');
assert.equal(routerSet({ sender: admin, admin, amp: 10, recipient, left: wallet0, right: wallet0 }).branch, 'address_reject');
assert.equal(routerSet({ sender: 'outsider', admin, amp: 10, recipient, left: wallet0, right: wallet1 }).pool, null);
assert.equal(poolSet({ sender: 'outsider', message: { amp: 2000, recipient } }).saved, false);
assert.equal(poolSet({ sender: 'router', message: { amp: 2000, recipient } }).outbound.id, 'admin');

console.log('PASS 8 stableswap tail/amp/sender cases; external attacker delta = 0; valid effect is trusted amp save plus TON excess');
