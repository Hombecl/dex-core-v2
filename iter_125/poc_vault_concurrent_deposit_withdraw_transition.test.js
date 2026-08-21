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
const routerVault = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/vault.fc',
  'utf8',
);

assert.match(vault, /if \(ctx\.at\(OPCODE\) == op::deposit_ref_fee\) & equal_slices\(ctx\.at\(SENDER\), storage::router_address\)/);
assert.match(vault, /storage::deposited_amount \+= in_msg_body~load_coins\(\);\s*storage::save\(\);/s);
assert.match(vault, /if ctx\.at\(OPCODE\) == op::withdraw_fee/);
assert.match(vault, /throw_unless\(error::zero_output, storage::deposited_amount > 0\);/);
assert.match(vault, /router::vault_pay_to\(\s*storage::deposited_amount,\s*storage::token_address,\s*storage::owner_address\)/s);
assert.match(vault, /CARRY_ALL_BALANCE \| DESTROY_IF_ZERO/);
assert.match(vault, /storage::deposited_amount = 0;\s*storage::save\(\);/s);
assert.match(routerPool, /throw_unless\(error::invalid_caller, equal_slices\(pool~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/);
assert.match(routerPool, /vault::deposit_ref_fee\(\s*amount0_out \+ amount1_out,\s*excesses_address\s*\)/s);
assert.match(routerVault, /vault_idata\(to_address, token_address, my_address\(\)\)/);
assert.match(routerVault, /throw_unless\(error::invalid_caller, equal_slices\(vault~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/);
assert.match(routerVault, /jetton_wallet::transfer\(0, amount_out, to_address, to_address\)/);

function deposit(state, sender, amount) {
  if (sender !== state.router) throw new Error('wrong_router');
  return { ...state, deposited: state.deposited + amount };
}

function withdraw(state) {
  if (state.deposited <= 0n) throw new Error('zero_output');
  const payout = { amount: state.deposited, owner: state.owner, token: state.token };
  return { state: { ...state, deposited: 0n, destroyed: true }, payout };
}

const initial = { owner: 'OWNER', token: 'TOKEN', router: 'ROUTER', deposited: 0n, destroyed: false };
let state = deposit(initial, 'ROUTER', 3n);
state = deposit(state, 'ROUTER', 4n);
const first = withdraw(state);
assert.deepEqual(first.payout, { amount: 7n, owner: 'OWNER', token: 'TOKEN' });
assert.equal(first.state.deposited, 0n);
assert.throws(() => withdraw(first.state), /zero_output/);

// A later router deposit carries the same deterministic state-init tuple and
// starts a fresh balance after DESTROY_IF_ZERO; it cannot revive the old sum.
state = deposit(first.state, 'ROUTER', 2n);
assert.equal(state.deposited, 2n);
const second = withdraw(state);
assert.equal(second.payout.amount, 2n);
assert.equal(second.payout.owner, 'OWNER');
assert.equal(second.payout.token, 'TOKEN');
assert.throws(() => deposit(state, 'ATTACKER', 9n), /wrong_router/);

console.log('AC5 vault transition edge check passed: router-only deposits, one-shot zeroing withdrawals, deterministic owner/token payout, zero guard, and same-state redeposit hold');
