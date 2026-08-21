const assert = require('node:assert/strict');
const fs = require('node:fs');

const vault = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/vault.fc',
  'utf8',
);
const routerPool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/pool.fc',
  'utf8',
);

const MAX_COINS = (1n << 120n) - 1n;
assert.match(vault, /storage::deposited_amount = ds~load_coins\(\);/);
assert.match(vault, /\.store_coins\(storage::deposited_amount\)/);
assert.match(vault, /storage::deposited_amount \+= in_msg_body~load_coins\(\);\s*storage::save\(\);/s);
assert.match(vault, /;; assume deposited_amount will never exceed max coin limit/);
assert.match(vault, /router::vault_pay_to\(\s*storage::deposited_amount,\s*storage::token_address,\s*storage::owner_address\)/s);
assert.match(routerPool, /vault::deposit_ref_fee\(\s*amount0_out \+ amount1_out,\s*excesses_address\s*\)/s);

function storeCoins(value) {
  if (value < 0n || value > MAX_COINS) throw new Error('coin_width');
  return value;
}

function deposit(state, sender, amount) {
  if (sender !== state.router) throw new Error('wrong_router');
  const next = storeCoins(state.amount + storeCoins(amount));
  return { ...state, amount: next };
}

function withdraw(state) {
  if (state.amount <= 0n) throw new Error('zero_output');
  const message = { amount: storeCoins(state.amount), token: state.token, owner: state.owner };
  return { state: { ...state, amount: 0n }, message };
}

assert.equal(storeCoins(0n), 0n);
assert.equal(storeCoins(MAX_COINS), MAX_COINS);
assert.throws(() => storeCoins(MAX_COINS + 1n), /coin_width/);

const base = { amount: MAX_COINS - 5n, owner: 'OWNER', token: 'TOKEN', router: 'ROUTER' };
const atMax = deposit(base, 'ROUTER', 5n);
assert.equal(atMax.amount, MAX_COINS);
assert.throws(() => deposit(atMax, 'ROUTER', 1n), /coin_width/);
assert.equal(atMax.amount, MAX_COINS);

const paid = withdraw(atMax);
assert.deepEqual(paid.message, { amount: MAX_COINS, token: 'TOKEN', owner: 'OWNER' });
assert.equal(paid.state.amount, 0n);
assert.throws(() => withdraw(paid.state), /zero_output/);
assert.throws(() => deposit(paid.state, 'ATTACKER', 1n), /wrong_router/);

console.log('AD4 coin-width edge check passed: max-width storage and withdrawal encode, overflow rolls back before save, and router-only deposits remain owner/token bound');
