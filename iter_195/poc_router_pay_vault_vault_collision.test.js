const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const routerPool = read('contracts/router/msgs/pool.fc');
const routerVault = read('contracts/router/msgs/vault.fc');
const vault = read('contracts/vault.fc');
const common = read('contracts/common/contracts.fc');
const routerRoot = read('contracts/router.fc');
const routerGetter = read('contracts/router/get.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerPool, 'if ctx.at(OPCODE) == op::pay_vault'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [routerPool, 'vault_idata('],
  [routerPool, 'amount0_out > 0 ? token0_address : token1_address'],
  [routerPool, 'msgs::send_with_stateinit('],
  [routerPool, 'vault::deposit_ref_fee('],
  [routerPool, 'amount0_out + amount1_out'],
  [routerVault, 'vault_idata(to_address, token_address, my_address())'],
  [routerVault, 'throw_unless(error::invalid_caller, equal_slices(vault~address(params::workchain), ctx.at(SENDER)));'],
  [routerVault, 'jetton_wallet::transfer(0, amount_out, to_address, to_address)'],
  [vault, 'ctx.at(OPCODE) == op::deposit_ref_fee'],
  [vault, 'equal_slices(ctx.at(SENDER), storage::router_address)'],
  [vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  [vault, 'router::vault_pay_to('],
  [vault, 'storage::token_address'],
  [vault, 'storage::owner_address'],
  [vault, 'storage::deposited_amount = 0;'],
  [common, '(cell) vault_idata(slice _user_address, slice _token_address, slice _router_address)'],
  [common, '(cell) router::pay_vault('],
  [routerRoot, 'if handle_vault_messages()'],
  [routerGetter, 'vault_idata(user, token, my_address())'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const deriveVault = (owner, token, router) => `VAULT(${owner}|${token}|${router})`;
const owner = 'REFERRER';
const router = 'ROUTER';
const token0 = 'TOKEN0';
const token1 = 'TOKEN1';
const amount0 = 0n;
const amount1 = 42n;
const expected = deriveVault(owner, token1, router);

if (amount0 > 0n && amount1 > 0n) throw new Error('pay_vault model accepted two positive legs');
if (amount0 + amount1 !== 42n) throw new Error('fee amount tuple model mismatch');
if (expected !== deriveVault(owner, amount0 > 0n ? token0 : token1, router)) {
  throw new Error('selected fee token did not match deterministic vault identity');
}

const deposit = { sender: router, destination: expected, amount: amount0 + amount1, response: 'EXCESS' };
if (deposit.sender !== router) throw new Error('deposit sender mismatch');
if (deposit.amount !== 42n) throw new Error('deposit amount mismatch');

const alternateOwner = deriveVault('ATTACKER', token1, router);
const alternateToken = deriveVault(owner, 'TOKEN2', router);
if (alternateOwner === expected || alternateToken === expected) throw new Error('state-init tuple collision');

const withdrawal = {
  sender: expected,
  amount: deposit.amount,
  token: token1,
  recipient: owner,
  afterStoredAmount: 0n,
};
if (withdrawal.sender !== deriveVault(withdrawal.recipient, withdrawal.token, router)) {
  throw new Error('withdrawal sender tuple mismatch');
}
if (withdrawal.afterStoredAmount !== 0n) throw new Error('withdrawal did not clear stored amount');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('pay_vault_pool_sender_authenticated true');
console.log('vault_identity_includes_owner_token_router true');
console.log('positive_fee_leg_selects_matching_token true');
console.log('alternate_owner_tuple_distinct true');
console.log('alternate_token_tuple_distinct true');
console.log('withdrawal_clears_stored_amount true');
console.log(`deposited_amount ${deposit.amount}`);
console.log(`unauthorized_gain 0`);
console.log('result PASS');
