const assert = require('node:assert/strict');
const fs = require('node:fs');

const routerVault = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/vault.fc',
  'utf8',
);
const vault = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/vault.fc',
  'utf8',
);
const routerPool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/pool.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);
const routerRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router.fc',
  'utf8',
);

assert.match(routerVault, /int amount_out = in_msg_body~load_coins\(\);\s*slice token_address = in_msg_body~load_msg_addr\(\);\s*slice to_address = in_msg_body~load_msg_addr\(\);\s*in_msg_body\.end_parse\(\);/s);
assert.match(routerVault, /vault_idata\(to_address, token_address, my_address\(\)\)/s);
assert.match(routerVault, /throw_unless\(error::invalid_caller, equal_slices\(vault~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/s);
assert.match(routerVault, /jetton_wallet::transfer\(0, amount_out, to_address, to_address\)/);
assert.match(routerVault, /msgs::send_simple\(0, token_address, msg\.end_cell\(\), QCARRY_ALL_BALANCE\)/s);
assert.match(vault, /storage::deposited_amount > 0/);
assert.match(vault, /router::vault_pay_to\(\s*storage::deposited_amount,\s*storage::token_address,\s*storage::owner_address\)/s);
assert.match(vault, /storage::deposited_amount = 0;\s*storage::save\(\);/s);
assert.match(routerPool, /vault_idata\(\s*owner,\s*amount0_out > 0 \? token0_address : token1_address,\s*my_address\(\)\s*\)/s);
assert.match(contracts, /\(cell\) vault_idata\(slice _user_address, slice _token_address, slice _router_address\)/);
assert.match(routerRoot, /if handle_vault_messages\(\) \{\s*return \(\);/s);

function deriveVault(owner, token, router) {
  return `VAULT(${owner}|${token}|${router})`;
}

function withdrawAndPay(state) {
  assert(state.amount > 0n);
  const sender = deriveVault(state.owner, state.token, state.router);
  return {
    sender,
    body: { amount: state.amount, token: state.token, to: state.owner },
    after: { ...state, amount: 0n },
  };
}

function routerVaultPay(body, sender, router) {
  const expected = deriveVault(body.to, body.token, router);
  assert.equal(sender, expected);
  return { destinationTokenWallet: body.token, amount: body.amount, owner: body.to, response: body.to };
}

const state = { owner: 'REFERRER', token: 'TOKEN1', router: 'ROUTER', amount: 42n };
const withdrawal = withdrawAndPay(state);
assert.deepEqual(withdrawal.body, { amount: 42n, token: 'TOKEN1', to: 'REFERRER' });
assert.deepEqual(routerVaultPay(withdrawal.body, withdrawal.sender, 'ROUTER'), {
  destinationTokenWallet: 'TOKEN1', amount: 42n, owner: 'REFERRER', response: 'REFERRER',
});
assert.equal(withdrawal.after.amount, 0n);

assert.throws(() => routerVaultPay({ amount: 42n, token: 'TOKEN2', to: 'REFERRER' }, withdrawal.sender, 'ROUTER'), /VAULT/);
assert.throws(() => routerVaultPay({ amount: 42n, token: 'TOKEN1', to: 'ATTACKER' }, withdrawal.sender, 'ROUTER'), /VAULT/);
assert.throws(() => routerVaultPay({ amount: 999n, token: 'TOKEN1', to: 'REFERRER' }, 'FOREIGN_VAULT', 'ROUTER'), /VAULT/);
assert.throws(() => withdrawAndPay({ ...state, amount: 0n }), /> 0/);

const alternate = withdrawAndPay({ owner: 'REFERRER', token: 'TOKEN2', router: 'ROUTER', amount: 42n });
assert.notEqual(alternate.sender, withdrawal.sender);
assert.notEqual(deriveVault('REFERRER', 'TOKEN1', 'ROUTER'), deriveVault('ATTACKER', 'TOKEN1', 'ROUTER'));

console.log('AE4 vault payout edge check passed: the body tuple must derive the sending vault, the outgoing token and owner are the same stored tuple, withdrawal clears once, and alternate owner/token tuples map to distinct state-init identities');
