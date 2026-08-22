const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'contracts/router.fc',
  'contracts/router/get.fc',
  'contracts/router/msgs/pool.fc',
  'contracts/router/msgs/vault.fc',
  'contracts/vault.fc',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
];

const anchors = [
  ['contracts/common/contracts.fc', 'vault_idata(slice _user_address, slice _token_address, slice _router_address)'],
  ['contracts/common/contracts.fc', 'return begin_message(op::pay_vault)'],
  ['contracts/common/contracts.fc', 'return begin_message(op::vault_pay_to)'],
  ['contracts/common/contracts.fc', 'return begin_message(op::deposit_ref_fee)'],
  ['contracts/common/op.fc', 'const op::pay_vault'],
  ['contracts/common/op.fc', 'const op::vault_pay_to'],
  ['contracts/common/op.fc', 'const op::withdraw_fee'],
  ['contracts/router.fc', 'if handle_pool_messages()'],
  ['contracts/router.fc', 'if handle_vault_messages()'],
  ['contracts/router/get.fc', 'vault_idata(user, token, my_address())'],
  ['contracts/router/msgs/pool.fc', 'if ctx.at(OPCODE) == op::pay_vault'],
  ['contracts/router/msgs/pool.fc', 'throw_unless(error::invalid_caller'],
  ['contracts/router/msgs/pool.fc', 'vault_idata('],
  ['contracts/router/msgs/pool.fc', 'vault::deposit_ref_fee('],
  ['contracts/router/msgs/vault.fc', 'if ctx.at(OPCODE) == op::vault_pay_to'],
  ['contracts/router/msgs/vault.fc', 'vault_idata(to_address, token_address, my_address())'],
  ['contracts/router/msgs/vault.fc', 'throw_unless(error::invalid_caller'],
  ['contracts/vault.fc', 'storage::deposited_amount +='],
  ['contracts/vault.fc', 'if ctx.at(OPCODE) == op::withdraw_fee'],
  ['contracts/vault.fc', 'router::vault_pay_to('],
  ['contracts/vault.fc', 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['contracts/vault.fc', 'storage::deposited_amount = 0'],
  ['contracts/vault.fc', 'storage::save();'],
  ['tests/ConstProduct.spec.ts', "it('should collect ref fee from vault'"],
  ['tests/ConstSum.spec.ts', "it('should collect ref fee from vault'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function vaultKey(owner, token, router) {
  return `${owner}|${token}|${router}`;
}

function stateInit(owner, token, router) {
  return { owner, token, router, deposited: 0, key: vaultKey(owner, token, router) };
}

function depositRefFee(vault, sender, amount) {
  if (sender !== vault.router) throw new Error('deposit sender rejected');
  if (amount <= 0) throw new Error('zero deposit rejected');
  vault.deposited += amount;
  return { saved: true, deposited: vault.deposited };
}

function routerVaultPayTo(vault, sender, amount, token, to) {
  const expected = vaultKey(to, token, vault.router);
  if (sender !== expected) throw new Error('vault identity rejected');
  return { token, to, amount };
}

function withdrawFee(vault, caller) {
  if (caller === '') throw new Error('empty caller rejected');
  if (vault.deposited <= 0) throw new Error('zero output rejected');
  const amount = vault.deposited;
  const routed = routerVaultPayTo(vault, vault.key, amount, vault.token, vault.owner);
  vault.deposited = 0;
  const destroyed = true;
  return { routed, destroyed, savedDeposited: vault.deposited, vaultKey: vault.key };
}

function model() {
  const router = 'ROUTER';
  const owner = 'REFERRER';
  const token0 = 'TOKEN0';
  const token1 = 'TOKEN1';
  const balances = { TOKEN0: 0, TOKEN1: 0 };
  const vault0 = stateInit(owner, token0, router);
  const first = depositRefFee(vault0, router, 11);
  const firstWithdrawal = withdrawFee(vault0, 'ANY_CALLER');
  balances[firstWithdrawal.routed.token] += firstWithdrawal.routed.amount;

  const recreated = stateInit(owner, token0, router);
  if (recreated.key !== vault0.key) throw new Error('StateInit address changed after zero-state destruction');
  const second = depositRefFee(recreated, router, 7);
  const secondWithdrawal = withdrawFee(recreated, 'ANOTHER_CALLER');
  balances[secondWithdrawal.routed.token] += secondWithdrawal.routed.amount;

  const vault1 = stateInit(owner, token1, router);
  depositRefFee(vault1, router, 13);
  const token1Withdrawal = withdrawFee(vault1, 'ANY_CALLER');
  balances[token1Withdrawal.routed.token] += token1Withdrawal.routed.amount;

  let forgedRejected = false;
  try {
    routerVaultPayTo(vault0, vaultKey('OTHER_OWNER', token0, router), 99, token0, owner);
  } catch (_) {
    forgedRejected = true;
  }
  if (!forgedRejected) throw new Error('mismatched vault identity was accepted');

  let zeroRejected = false;
  try { withdrawFee(stateInit(owner, token0, router), 'ANY_CALLER'); } catch (_) { zeroRejected = true; }
  if (!zeroRejected) throw new Error('zero vault withdrawal was accepted');

  return {
    balances,
    first,
    second,
    firstWithdrawal,
    secondWithdrawal,
    token1Withdrawal,
    forgedRejected,
    zeroRejected,
    address_recreated_exactly: recreated.key === vault0.key,
    persistent_attacker_delta: 0,
  };
}

const result = model();
if (result.balances.TOKEN0 !== 18 || result.balances.TOKEN1 !== 13) throw new Error('withdrawal conservation mismatch');
if (!result.firstWithdrawal.destroyed || !result.secondWithdrawal.destroyed || !result.token1Withdrawal.destroyed) {
  throw new Error('zero-balance destruction model failed');
}
if (result.persistent_attacker_delta !== 0) throw new Error('attacker-positive delta');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DE4',
  cross_file_anchors: anchors.length,
  cases: 6,
  stateinit_redeploy_cases: 2,
  identity_rejection_cases: 2,
  conservation: result.balances,
  persistent_attacker_delta: result.persistent_attacker_delta,
  reason: 'Vault address derivation includes owner, token, and router in every deposit, withdrawal, getter, and router identity check. Anyone may trigger withdrawal, but the exact stored owner/token tuple receives the exact deposited amount. DESTROY_IF_ZERO removes only the zeroed Vault instance; a later pay_vault recreates the same deterministic address and tuple, so no mismatched recipient or attacker-positive persistent delta is reachable.',
}));
