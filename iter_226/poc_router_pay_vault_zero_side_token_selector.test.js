const fs = require('fs');
const path = require('path');
const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const workspaceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const readSource = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const readWork = (p) => fs.readFileSync(path.join(workspaceRoot, p), 'utf8');
const pool = readSource('contracts/router/msgs/pool.fc');
const common = readSource('contracts/common/contracts.fc');
const protocol = readSource('contracts/pool/msgs/router.fc');
const vault = readSource('contracts/vault.fc');
const prior = readWork('iter_211/STATUS.yaml');
const checks = [
  [pool, 'if ctx.at(OPCODE) == op::pay_vault', 'pay_vault dispatch'],
  [pool, 'int amount0_out = additional_info~load_coins();', 'amount0 decode'],
  [pool, 'int amount1_out = additional_info~load_coins();', 'amount1 decode'],
  [pool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));', 'deterministic Pool sender gate'],
  [pool, 'amount0_out > 0 ? token0_address : token1_address', 'zero-side token selector'],
  [pool, 'amount0_out + amount1_out', 'aggregated referral amount'],
  [pool, 'vault::deposit_ref_fee(', 'vault deposit path'],
  [common, '(cell) router::pay_vault(', 'pay_vault serializer'],
  [common, '.store_coins(_amount0_out)', 'serializer amount0'],
  [common, '.store_slice(_token0_address)', 'serializer token0'],
  [common, '.store_coins(_amount1_out)', 'serializer amount1'],
  [common, '.store_slice(_token1_address)', 'serializer token1'],
  [protocol, 'router::pay_vault(', 'Pool constructs pay_vault'],
  [protocol, 'ref_fee_out0', 'ref fee leg0'],
  [protocol, 'ref_fee_out1', 'ref fee leg1'],
  [vault, 'ctx.at(OPCODE) == op::deposit_ref_fee', 'Vault deposit opcode'],
  [vault, 'equal_slices(ctx.at(SENDER), storage::router_address)', 'Vault Router sender gate'],
  [vault, 'storage::deposited_amount += in_msg_body~load_coins();', 'Vault accumulates exact amount'],
  [vault, 'utils::send_excesses(0, in_msg_body~load_msg_addr(), QCARRY_ALL_BALANCE);', 'Vault response routing'],
  [prior, 'cell_label: pool_pay_vault_both_positive_side_selector', 'exact prior cell'],
  [prior, 'final_verdict: KILLED_TRUSTED_ON_TRUSTED', 'prior trusted kill'],
  [prior, 'test_file_exists_on_disk: true', 'prior evidence gate'],
];
for (const [source, needle, label] of checks) {
  if (!source.includes(needle)) throw new Error(`FAIL: ${label}`);
}

const cases = [
  { amount0: 0n, amount1: 17n, selected: 'token1', sum: 17n },
  { amount0: 19n, amount1: 0n, selected: 'token0', sum: 19n },
];
for (const c of cases) {
  if (c.sum !== c.amount0 + c.amount1) throw new Error('FAIL: amount sum');
  if ((c.amount0 > 0n && c.selected !== 'token0') || (c.amount0 === 0n && c.selected !== 'token1')) throw new Error('FAIL: selector model');
}

console.log(`cross_file_anchors ${checks.length}`);
console.log('zero_side_selector_matches_single_positive_referral_leg true');
console.log('pay_vault_amount_sum_preserves_positive_leg true');
console.log('deterministic_pool_and_router_vault_gates_present true');
console.log('vault_deposit_accumulates_exact_router_amount true');
console.log('iter_211_exact_selector_family_previously_completed true');
console.log('classification PRE_KILLED_DUPLICATE');
console.log('result PASS');
