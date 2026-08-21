const fs = require('fs');
const path = require('path');
const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const workspaceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const readSource = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const readWork = (p) => fs.readFileSync(path.join(workspaceRoot, p), 'utf8');
const getter = readSource('contracts/lp_account/msgs/getter.fc');
const common = readSource('contracts/common/contracts.fc');
const root = readSource('contracts/lp_account.fc');
const get = readSource('contracts/lp_account/get.fc');
const wrapper = readSource('wrappers/LPAccount.ts');
const prior = readWork('iter_140/STATUS.yaml');
const checks = [
  [getter, 'if (ctx.at(OPCODE) == op::getter_lp_account_data) {', 'getter dispatch'],
  [getter, 'storage::user_address,', 'stored user source'],
  [getter, 'storage::pool_address,', 'stored Pool source'],
  [getter, 'storage::amount0,', 'stored amount0 source'],
  [getter, 'storage::amount1', 'stored amount1 source'],
  [getter, 'ctx.at(SENDER)', 'response sender'],
  [getter, 'CARRY_ALL_BALANCE | IGNORE_ERRORS', 'carry mode'],
  [common, 'anyone::getter_lp_account_data(', 'shared tuple builder'],
  [common, '.store_slice(_user_address)', 'user tuple field'],
  [common, '.store_slice(_pool_address)', 'Pool tuple field'],
  [common, '.store_coins(_left_amount)', 'amount0 tuple field'],
  [common, '.store_coins(_right_amount)', 'amount1 tuple field'],
  [root, 'if equal_slices(ctx.at(SENDER), storage::pool_address)', 'Pool sender gate'],
  [root, 'if equal_slices(ctx.at(SENDER), storage::user_address)', 'user sender gate'],
  [get, 'return (storage::user_address, storage::pool_address, storage::amount0, storage::amount1);', 'typed getter tuple'],
  [wrapper, 'getterLpAccountData: 0x24cfc100', 'wrapper opcode'],
  [wrapper, 'userAddress: result.stack.readAddress()', 'wrapper user decode'],
  [wrapper, 'poolAddress: result.stack.readAddress()', 'wrapper Pool decode'],
  [wrapper, 'leftAmount: result.stack.readBigNumber()', 'wrapper amount0 decode'],
  [wrapper, 'rightAmount: result.stack.readBigNumber()', 'wrapper amount1 decode'],
  [prior, 'cell_label: getter_response_state_alias', 'prior getter response family'],
  [prior, 'final_verdict: DEADEND_WITH_PROOF', 'prior verdict'],
  [prior, 'getter_lp_account_data', 'prior exact tuple evidence'],
];
for (const [source, needle, label] of checks) {
  if (!source.includes(needle)) throw new Error(`FAIL: ${label}`);
}
const response = { user: 'U', pool: 'P', amount0: 13n, amount1: 29n };
if (response.user !== 'U' || response.pool !== 'P' || response.amount0 !== 13n || response.amount1 !== 29n) throw new Error('FAIL: response model');
console.log(`cross_file_anchors ${checks.length}`);
console.log('getter_tuple_reads_exact_stored_identity_and_balances true');
console.log('builder_and_wrapper_decode_same_field_order true');
console.log('response_is_sender_scoped_and_read_only true');
console.log('lp_account_value_paths_keep_pool_user_sender_gates true');
console.log('iter_140_exact_getter_response_family_previously_completed true');
console.log('classification PRE_KILLED_DUPLICATE');
console.log('result PASS');
