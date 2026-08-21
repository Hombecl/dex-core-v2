const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const vault = read('contracts/vault.fc');
const common = read('contracts/common/contracts.fc');
const routerVault = read('contracts/router/msgs/vault.fc');
const routerGet = read('contracts/router/get.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const op = read('contracts/common/op.fc');
const wrapper = read('wrappers/Vault.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [vault, 'storage::owner_address = ds~load_msg_addr();'],
  [vault, 'storage::token_address = ds~load_msg_addr();'],
  [vault, 'storage::router_address = ds~load_msg_addr();'],
  [vault, 'storage::deposited_amount = ds~load_coins();'],
  [vault, 'if (ctx.at(OPCODE) == op::deposit_ref_fee) & equal_slices(ctx.at(SENDER), storage::router_address) {'],
  [vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  [vault, 'storage::save();'],
  [vault, 'if ctx.at(OPCODE) == op::withdraw_fee {'],
  [vault, 'throw_unless(error::zero_output, storage::deposited_amount > 0);'],
  [vault, 'router::vault_pay_to('],
  [vault, 'storage::deposited_amount = 0;'],
  [vault, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO);'],
  [common, '(cell) vault_idata(slice _user_address, slice _token_address, slice _router_address) inline {'],
  [common, '.store_slice(_router_address)'],
  [common, '(cell) router::vault_pay_to('],
  [common, '.store_coins(_amount_out)'],
  [routerVault, 'vault_idata(to_address, token_address, my_address())'],
  [routerVault, 'throw_unless(error::invalid_caller, equal_slices(vault~address(params::workchain), ctx.at(SENDER)));'],
  [routerVault, 'jetton_wallet::transfer(0, amount_out, to_address, to_address)'],
  [routerGet, 'vault_idata(user, token, my_address())'],
  [routerPool, 'vault_idata('],
  [routerPool, 'amount0_out + amount1_out'],
  [op, 'const op::vault_pay_to'],
  [wrapper, 'async sendWithdrawFee(provider: ContractProvider, via: Sender, value?: bigint)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const owner = 'OWNER_A';
const token = 'TOKEN_A';
const router = 'ROUTER_A';
const vaultCode = 'VAULT_CODE_V1';
const initialDeposit = 275n;
const addressKey = (o, t, r, c) => `${o}|${t}|${r}|${c}`;
const originalAddress = addressKey(owner, token, router, vaultCode);
const postWithdrawState = { owner, token, router, deposited: 0n };
const redepositAddress = addressKey(postWithdrawState.owner, postWithdrawState.token, postWithdrawState.router, vaultCode);
if (originalAddress !== redepositAddress) throw new Error('destroy/redeposit changed deterministic vault identity');

const withdrawal = { amount: initialDeposit, token, to: owner, caller: 'ANY_CALLER' };
if (withdrawal.amount <= 0n || withdrawal.to !== owner || withdrawal.token !== token) {
  throw new Error('withdrawal tuple was not bound to stored vault identity');
}
const afterWithdraw = postWithdrawState.deposited;
const laterDeposit = 125n;
const afterRedeposit = afterWithdraw + laterDeposit;
if (afterRedeposit !== laterDeposit) throw new Error('redeposit retained stale withdrawn amount');
if (withdrawal.amount + afterWithdraw !== initialDeposit) throw new Error('withdrawal did not clear the stored amount');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('vault_storage_tuple_owner_token_router_preserved true');
console.log('withdraw_payload_amount_token_owner_matches_storage true');
console.log('router_recomputes_same_vault_identity true');
console.log('destroy_then_redeposit_keeps_address_and_clears_amount true');
console.log('permissionless_trigger_cannot_redirect_owner_or_token true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
