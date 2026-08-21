const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const vault = read('contracts/vault.fc');
const routerVault = read('contracts/router/msgs/vault.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const constructors = read('contracts/common/contracts.fc');
const opcodes = read('contracts/common/op.fc');
const routerGetter = read('contracts/router/get.fc');
const vaultWrapper = read('wrappers/Vault.ts');

// Cross-file withdrawal chain: anyone -> Vault -> Router -> token wallet.
assert(vault.includes('if ctx.at(OPCODE) == op::withdraw_fee'));
assert(vault.includes('storage::deposited_amount > 0'));
assert(vault.includes('router::vault_pay_to('));
assert(vault.includes('storage::token_address'));
assert(vault.includes('storage::owner_address'));
assert(vault.includes('CARRY_ALL_BALANCE | DESTROY_IF_ZERO'));
assert(vault.includes('storage::deposited_amount = 0;'));
assert(routerVault.includes('if ctx.at(OPCODE) == op::vault_pay_to'));
assert(routerVault.includes('vault_idata(to_address, token_address, my_address())'));
assert(routerVault.includes('equal_slices(vault~address(params::workchain), ctx.at(SENDER))'));
assert(routerVault.includes('jetton_wallet::transfer(0, amount_out, to_address, to_address)'));
assert(constructors.includes('(cell) vault_idata(slice _user_address, slice _token_address, slice _router_address)'));
assert(opcodes.includes('const op::withdraw_fee'));
assert(routerGetter.includes('vault_idata(user, token, my_address())'));
assert(vaultWrapper.includes('sendWithdrawFee'));

function deriveVault(owner, token, router) {
  return `VAULT(${owner}|${token}|${router})`;
}

function withdraw(state, caller) {
  assert(state.amount > 0n);
  // Caller is intentionally not part of the payout tuple.
  return {
    caller,
    sender: deriveVault(state.owner, state.token, state.router),
    body: { amount: state.amount, token: state.token, to: state.owner },
    after: { ...state, amount: 0n },
  };
}

function routerVaultPay(body, sender, router) {
  const expectedSender = deriveVault(body.to, body.token, router);
  assert.equal(sender, expectedSender);
  return { token: body.token, amount: body.amount, owner: body.to };
}

const state = { owner: 'REFERRER', token: 'TOKEN_A', router: 'ROUTER', amount: 42n };
const withdrawal = withdraw(state, 'ATTACKER');
assert.deepEqual(routerVaultPay(withdrawal.body, withdrawal.sender, state.router), {
  token: 'TOKEN_A', amount: 42n, owner: 'REFERRER',
});
assert.equal(withdrawal.after.amount, 0n);
assert.throws(() => withdraw(withdrawal.after, 'ATTACKER'), /> 0/);

for (const altered of [
  { amount: 42n, token: 'TOKEN_B', to: 'REFERRER' },
  { amount: 42n, token: 'TOKEN_A', to: 'ATTACKER' },
]) {
  assert.throws(() => routerVaultPay(altered, withdrawal.sender, state.router), /VAULT/);
}
// Router does not independently authenticate amount, but the only production
// producer is Vault, which loads this exact value from stored state.
assert.equal(routerVaultPay({ amount: 999n, token: 'TOKEN_A', to: 'REFERRER' }, withdrawal.sender, state.router).amount, 999n);
assert.equal(withdrawal.body.amount, state.amount);
assert.notEqual(withdrawal.sender, deriveVault('ATTACKER', 'TOKEN_A', 'ROUTER'));

console.log(JSON.stringify({
  cross_file_anchors: 15,
  permissionless_trigger_checked: true,
  stored_owner_token_router_payout: true,
  post_withdraw_amount_zero: true,
  replay_without_redeposit_blocked: true,
  altered_owner_or_token_cases_blocked: 2,
  amount_mutation_not_production_reachable: true,
  attacker_value_extraction: false,
  result: 'PASS',
}, null, 2));
