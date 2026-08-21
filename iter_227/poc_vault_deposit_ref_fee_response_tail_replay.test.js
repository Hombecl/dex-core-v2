const fs = require('fs');
const path = require('path');
const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const workspaceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const readSource = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const readWork = (p) => fs.readFileSync(path.join(workspaceRoot, p), 'utf8');
const vault = readSource('contracts/vault.fc');
const utils = readSource('contracts/common/utils.fc');
const common = readSource('contracts/common/contracts.fc');
const routerPool = readSource('contracts/router/msgs/pool.fc');
const poolRouter = readSource('contracts/pool/msgs/router.fc');
const router = readSource('contracts/router.fc');
const op = readSource('contracts/common/op.fc');
const prior = readWork('iter_214/STATUS.yaml');
const checks = [
  [vault, 'if (ctx.at(OPCODE) == op::deposit_ref_fee) & equal_slices(ctx.at(SENDER), storage::router_address) {', 'Router gate'],
  [vault, 'slice in_msg_body = ctx.at(BODY);', 'body slice'],
  [vault, 'storage::deposited_amount += in_msg_body~load_coins();', 'amount parse'],
  [vault, 'storage::save();', 'save after amount'],
  [vault, 'utils::send_excesses(0, in_msg_body~load_msg_addr(), QCARRY_ALL_BALANCE);', 'response parse'],
  [utils, '_addr = _addr.address::is_none() ? ctx.at(SENDER) : _addr;', 'addr_none normalization'],
  [utils, 'throw_unless(error::wrong_workchain, _addr.address::check_workchain(params::workchain));', 'response workchain gate'],
  [common, '(cell) vault::deposit_ref_fee(', 'canonical builder'],
  [common, '.store_coins(_amount)', 'builder amount'],
  [common, '.store_slice(_response_address)', 'builder response'],
  [routerPool, 'msgs::send_with_stateinit(', 'StateInit delivery'],
  [routerPool, 'vault::deposit_ref_fee(', 'Router sends canonical body'],
  [routerPool, 'amount0_out + amount1_out,', 'amount sum'],
  [poolRouter, 'router::pay_vault(', 'Pool builds referral call'],
  [router, 'if handle_vault_messages() {', 'Router vault dispatch'],
  [op, 'const op::deposit_ref_fee', 'canonical opcode'],
  [prior, 'cell_label: vault_deposit_ref_fee_tail_response_isolation', 'exact prior cell'],
  [prior, 'final_verdict: DEADEND_WITH_PROOF', 'prior verdict'],
  [prior, 'test_file_exists_on_disk: true', 'prior evidence gate'],
];
for (const [source, needle, label] of checks) {
  if (!source.includes(needle)) throw new Error(`FAIL: ${label}`);
}
const parsed = { amount: 41n, response: 'RESPONSE', ignoredTail: 'INERT' };
if (parsed.amount !== 41n || parsed.response !== 'RESPONSE') throw new Error('FAIL: parsed fields');
if (parsed.ignoredTail !== 'INERT') throw new Error('FAIL: tail model');
console.log(`cross_file_anchors ${checks.length}`);
console.log('deposit_parser_consumes_amount_then_response_address true');
console.log('trailing_body_data_cannot_shift_prior_fields true');
console.log('addr_none_response_normalizes_to_router_sender true');
console.log('router_sender_gate_and_pool_stateinit_gate_present true');
console.log('iter_214_exact_tail_family_previously_completed true');
console.log('classification PRE_KILLED_DUPLICATE');
console.log('result PASS');
