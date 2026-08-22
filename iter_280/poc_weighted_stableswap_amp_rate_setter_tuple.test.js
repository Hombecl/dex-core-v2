const assert = require('node:assert/strict');

const ONE_DEC = 1000000000000000000n;
const MAX_AMP = 2000n * ONE_DEC;

function routerSet({ sender, admin, amp, rate, weight, side, left, right, setter, tail = false }) {
  if (sender !== admin) return { branch: 'admin_reject', tuple: null };
  if (tail) return { branch: 'root_end_parse_reject', tuple: null };
  if (!(0n < weight && weight < ONE_DEC)) return { branch: 'weight_reject', tuple: null };
  if (amp > MAX_AMP) return { branch: 'amp_reject', tuple: null };
  if (left === right || (side !== left && side !== right)) return { branch: 'side_reject', tuple: null };
  if (setter !== null && setter.workchain !== 0) return { branch: 'setter_workchain_reject', tuple: null };
  return { branch: 'router_to_pool', tuple: { sender: 'router', amp, rate, weight, side, setter } };
}

function poolSet({ sender, token0, currentW0, oldRate, tuple }) {
  if (sender !== 'router') return { branch: 'pool_sender_reject' };
  const w0 = currentW0 === 0n && tuple.weight > 0n
    ? (tuple.side === token0 ? tuple.weight : ONE_DEC - tuple.weight)
    : currentW0;
  return {
    branch: 'write_and_save',
    amp: tuple.amp,
    rate: tuple.rate === 0n ? oldRate : tuple.rate,
    w0,
    setter: tuple.setter,
  };
}

function setterRate({ sender, storedSetter, newRate }) {
  if (storedSetter === null || sender !== storedSetter.id) return 'setter_reject';
  if (newRate <= 0n) return 'rate_domain_reject';
  return 'rate_write_and_save';
}

const admin = 'admin';
const token0 = 'token0_wallet';
const token1 = 'token1_wallet';
const alice = { id: 'alice', workchain: 0 };

const preserve = routerSet({ sender: admin, admin, amp: ONE_DEC, rate: 0n, weight: ONE_DEC / 2n, side: token0, left: token0, right: token1, setter: null });
const preserveOut = poolSet({ sender: preserve.tuple.sender, token0, currentW0: 0n, oldRate: 7n, tuple: preserve.tuple });
assert.equal(preserveOut.rate, 7n);
assert.equal(preserveOut.setter, null);

const setRate = routerSet({ sender: admin, admin, amp: ONE_DEC, rate: 9n, weight: ONE_DEC / 2n, side: token1, left: token0, right: token1, setter: alice });
const setRateOut = poolSet({ sender: setRate.tuple.sender, token0, currentW0: 0n, oldRate: 7n, tuple: setRate.tuple });
assert.equal(setRateOut.rate, 9n);
assert.equal(setRateOut.w0, ONE_DEC / 2n);
assert.equal(setterRate({ sender: 'alice', storedSetter: alice, newRate: 10n }), 'rate_write_and_save');
assert.equal(setterRate({ sender: 'bob', storedSetter: alice, newRate: 10n }), 'setter_reject');
assert.equal(setterRate({ sender: 'alice', storedSetter: alice, newRate: 0n }), 'rate_domain_reject');
assert.equal(routerSet({ sender: admin, admin, amp: MAX_AMP + 1n, rate: 1n, weight: 1n, side: token0, left: token0, right: token1, setter: null }).branch, 'amp_reject');
assert.equal(routerSet({ sender: admin, admin, amp: 1n, rate: 1n, weight: 0n, side: token0, left: token0, right: token1, setter: null }).branch, 'weight_reject');
assert.equal(routerSet({ sender: 'outsider', admin, amp: 1n, rate: 1n, weight: 1n, side: token0, left: token0, right: token1, setter: null }).tuple, null);
assert.equal(routerSet({ sender: admin, admin, amp: 1n, rate: 1n, weight: 1n, side: token0, left: token0, right: token1, setter: { id: 'bad', workchain: 1 } }).branch, 'setter_workchain_reject');

console.log('PASS 9 amp/rate/weight/setter cases; external attacker delta = 0; valid effects are trusted parameter saves');
