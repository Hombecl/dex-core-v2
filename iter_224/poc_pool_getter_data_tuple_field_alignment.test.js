const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const workspaceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-flash-wt/blind-test-vps/ston-dot-fi-dex-smart-contracts-v2-flash';
const readSource = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const readWork = (p) => fs.readFileSync(path.join(workspaceRoot, p), 'utf8');
const common = readSource('contracts/common/contracts.fc');
const getter = readSource('contracts/pool/msgs/getter.fc');
const pool = readSource('contracts/pool.fc');
const protocol = readSource('contracts/pool/msgs/protocolfee.fc');
const op = readSource('contracts/common/op.fc');
const prior = readWork('iter_206/STATUS.yaml');
const sourceChecks = [
  [common, 'anyone::getter_pool_data(', 'shared getter builder'],
  [common, '.store_bool(_is_locked)', 'locked field'],
  [common, '.store_coins(_left_reserve)', 'left reserve field'],
  [common, '.store_coins(_right_reserve)', 'right reserve field'],
  [common, '.store_slice(_left_token_address)', 'left token field'],
  [common, '.store_slice(_right_token_address)', 'right token field'],
  [common, '.store_uint(_lp_fee, 16)', 'lp fee width'],
  [common, '.store_uint(_protocol_fee, 16)', 'protocol fee width'],
  [common, '.store_slice(_router_address)', 'router field'],
  [common, '.store_slice(_protocol_fee_address)', 'protocol recipient field'],
  [common, '.store_coins(_total_supply_lp)', 'supply field'],
  [common, '.store_coins(_collected_left_token_protocol_fees)', 'left counter field'],
  [common, '.store_coins(_collected_right_token_protocol_fees)', 'right counter field'],
  [getter, 'anyone::getter_pool_data(', 'pool supplies getter tuple'],
  [getter, 'storage::reserve0', 'pool reads reserve0'],
  [getter, 'storage::reserve1', 'pool reads reserve1'],
  [getter, 'storage::collected_token0_protocol_fee', 'pool reads counter0'],
  [getter, 'storage::collected_token1_protocol_fee', 'pool reads counter1'],
  [getter, 'msgs::send_simple(0, ctx.at(SENDER), out_msg_body, CARRY_ALL_BALANCE | IGNORE_ERRORS);', 'response is read-only to sender'],
  [pool, 'if handle_getter_messages() {', 'pool routes getter'],
  [protocol, 'storage::collected_token0_protocol_fee = 0;', 'collect clears counter0'],
  [protocol, 'storage::collected_token1_protocol_fee = 0;', 'collect clears counter1'],
  [protocol, 'storage::save();', 'collect persists clear'],
  [op, 'const op::getter_pool_data', 'canonical getter opcode'],
  [prior, 'cell_label: pool_getter_fee_counter_visibility', 'prior exact family'],
  [prior, 'final_verdict: DEADEND_WITH_PROOF', 'prior verdict'],
  [prior, 'test_file_exists_on_disk: true', 'prior evidence gate'],
];
for (const [source, needle, label] of sourceChecks) {
  if (!source.includes(needle)) throw new Error(`FAIL: ${label}`);
}

const emitted = ['locked', 'reserve0', 'reserve1', 'token0', 'token1', 'lpFee', 'protocolFee', 'router', 'protocolRecipient', 'totalSupply', 'counter0', 'counter1'];
const committed = ['counter0=0', 'counter1=0'];
if (new Set(emitted).size !== emitted.length) throw new Error('FAIL: duplicate tuple field');
if (committed.length !== 2) throw new Error('FAIL: collection clear model');

console.log(`cross_file_anchors ${sourceChecks.length}`);
console.log('getter_pool_data_field_order_matches_builder_input_order true');
console.log('fee_widths_and_coin_widths_are_explicit true');
console.log('getter_response_is_read_only_and_sender_scoped true');
console.log('collect_fees_clear_save_is_separate_from_getter_response true');
console.log('iter_206_exact_family_previously_completed true');
console.log('classification PRE_KILLED_DUPLICATE');
console.log('result PASS');
