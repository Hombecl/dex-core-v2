const assert = require('node:assert/strict');

const ONE_DEC = 1000000000000000000n;

function routerSetParams({ sender, admin, newW, side, left, right, tail = false }) {
  if (sender !== admin) return { branch: 'admin_reject', poolMessage: null };
  if (tail) return { branch: 'root_end_parse_reject', poolMessage: null };
  if (!(0n < newW && newW < ONE_DEC)) return { branch: 'weight_domain_reject', poolMessage: null };
  if (left === right || (side !== left && side !== right)) return { branch: 'side_binding_reject', poolMessage: null };
  return { branch: 'router_to_pool', poolMessage: { sender: 'router', side, newW } };
}

function poolSetParams({ sender, token0, currentW0, side, newW }) {
  if (sender !== 'router') return { branch: 'pool_sender_reject', w0: currentW0 };
  if (currentW0 !== 0n) return { branch: 'one_time_noop', w0: currentW0 };
  const w0 = side === token0 ? newW : ONE_DEC - newW;
  return { branch: 'write_and_save', w0 };
}

const admin = 'admin';
const token0 = 'token0_wallet';
const token1 = 'token1_wallet';

const left = routerSetParams({ sender: admin, admin, newW: 800000000000000000n, side: token0, left: token0, right: token1 });
assert.equal(poolSetParams({ sender: left.poolMessage.sender, token0, currentW0: 0n, ...left.poolMessage }).w0, 800000000000000000n);

const right = routerSetParams({ sender: admin, admin, newW: 800000000000000000n, side: token1, left: token0, right: token1 });
assert.equal(poolSetParams({ sender: right.poolMessage.sender, token0, currentW0: 0n, ...right.poolMessage }).w0, 200000000000000000n);

assert.equal(poolSetParams({ sender: 'router', token0, currentW0: 800000000000000000n, side: token1, newW: 100000000000000000n }).branch, 'one_time_noop');
assert.equal(routerSetParams({ sender: admin, admin, newW: 0n, side: token0, left: token0, right: token1 }).branch, 'weight_domain_reject');
assert.equal(routerSetParams({ sender: admin, admin, newW: ONE_DEC, side: token0, left: token0, right: token1 }).branch, 'weight_domain_reject');
assert.equal(routerSetParams({ sender: admin, admin, newW: 800000000000000000n, side: 'outsider', left: token0, right: token1 }).branch, 'side_binding_reject');
assert.equal(routerSetParams({ sender: 'outsider', admin, newW: 800000000000000000n, side: token0, left: token0, right: token1 }).poolMessage, null);
assert.equal(poolSetParams({ sender: 'outsider', token0, currentW0: 0n, side: token0, newW: 800000000000000000n }).branch, 'pool_sender_reject');

console.log('PASS 7 weighted side/domain/sender cases; external attacker delta = 0; valid effect is one trusted w0 parameter save');
