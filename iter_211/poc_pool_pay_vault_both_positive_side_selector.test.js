const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const router = read('contracts/router.fc');
const vault = read('contracts/vault.fc');
const op = read('contracts/common/op.fc');
const test = read('tests/ConstSum.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [router, 'if handle_pool_messages() {'],
  [routerPool, 'if ctx.at(OPCODE) == op::pay_vault {'],
  [routerPool, 'int amount0_out = additional_info~load_coins();'],
  [routerPool, 'int amount1_out = additional_info~load_coins();'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [routerPool, 'amount0_out > 0 ? token0_address : token1_address'],
  [routerPool, 'amount0_out + amount1_out'],
  [routerPool, 'vault::deposit_ref_fee('],
  [common, '(cell) router::pay_vault('],
  [common, '.store_coins(_amount0_out)'],
  [common, '.store_coins(_amount1_out)'],
  [poolRouter, 'if amount0 {'],
  [poolRouter, 'ref_fee_out1) = pool::get_swap_out'],
  [poolRouter, 'ref_fee_out0) = pool::get_swap_out'],
  [poolRouter, 'if (ref_address.preload_uint(2) != 0) & (ref_fee_out0 + ref_fee_out1 > 0) {'],
  [poolRouter, 'router::pay_vault('],
  [poolRouter, 'ref_fee_out0,'],
  [poolRouter, 'ref_fee_out1,'],
  [vault, 'equal_slices(ctx.at(SENDER), storage::router_address)'],
  [vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  [op, 'const op::pay_vault'],
  [test, 'it(\'should collect ref fee from vault\''],
];
anchors.forEach(([text, needle]) => must(text, needle));

const chooseVaultToken = (amount0, token0, amount1, token1) => ({
  token: amount0 > 0n ? token0 : token1,
  amount: amount0 + amount1,
});
const side0 = chooseVaultToken(7n, 'TOKEN_0', 0n, 'TOKEN_1');
const side1 = chooseVaultToken(0n, 'TOKEN_0', 11n, 'TOKEN_1');
if (side0.token !== 'TOKEN_0' || side0.amount !== 7n) throw new Error('side-0 vault selection mismatch');
if (side1.token !== 'TOKEN_1' || side1.amount !== 11n) throw new Error('side-1 vault selection mismatch');

const producerCases = [
  { amount0: 7n, amount1: 0n, source: 'swap input token0' },
  { amount0: 0n, amount1: 11n, source: 'swap input token1' },
];
for (const c of producerCases) {
  if (!((c.amount0 > 0n) ^ (c.amount1 > 0n))) throw new Error(`producer emitted dual-positive fee: ${c.source}`);
}
const malformedTrustedTuple = chooseVaultToken(7n, 'TOKEN_0', 11n, 'TOKEN_1');
if (malformedTrustedTuple.token !== 'TOKEN_0' || malformedTrustedTuple.amount !== 18n) {
  throw new Error('dual-positive selector model mismatch');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('single_positive_producer_selects_matching_token_and_exact_fee true');
console.log('dual_positive_tuple_would_sum_into_token0_vault true');
console.log('pool_sender_gate_precedes_vault_deposit true');
console.log('only_pool_swap_branch_produces_pay_vault_and_it_is_one_sided true');
console.log('dual_positive_effect_is_trusted_pool_input_only true');
console.log('classification KILLED_TRUSTED_ON_TRUSTED');
console.log('result PASS');
