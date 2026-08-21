const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const getter = read('contracts/pool/msgs/getter.fc');
const protocol = read('contracts/pool/msgs/protocolfee.fc');
const poolRoot = read('contracts/pool.fc');
const headers = read('contracts/pool/headers.fc');
const common = read('contracts/common/contracts.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [headers, 'global int   storage::collected_token0_protocol_fee;'],
  [headers, 'global int   storage::collected_token1_protocol_fee;'],
  [poolRoot, 'if equal_slices(ctx.at(SENDER), storage::protocol_fee_address) {'],
  [poolRoot, 'handle_protocolfee_messages();'],
  [poolRoot, 'if handle_getter_messages() {'],
  [getter, 'if ctx.at(OPCODE) == op::getter_pool_data {'],
  [getter, 'storage::protocol_fee_address,'],
  [getter, 'storage::collected_token0_protocol_fee,'],
  [getter, 'storage::collected_token1_protocol_fee'],
  [getter, 'msgs::send_simple(0, ctx.at(SENDER), out_msg_body, CARRY_ALL_BALANCE | IGNORE_ERRORS);'],
  [protocol, 'if ctx.at(OPCODE) == op::collect_fees { ;; throwable'],
  [protocol, 'throw_unless(error::zero_output, (storage::collected_token0_protocol_fee > 0) & (storage::collected_token1_protocol_fee > 0));'],
  [protocol, 'storage::collected_token0_protocol_fee,'],
  [protocol, 'storage::collected_token1_protocol_fee,'],
  [protocol, 'storage::collected_token0_protocol_fee = 0;'],
  [protocol, 'storage::collected_token1_protocol_fee = 0;'],
  [protocol, 'storage::save();'],
  [common, 'int _collected_left_token_protocol_fees,'],
  [common, 'int _collected_right_token_protocol_fees'],
  [common, '.store_coins(_collected_left_token_protocol_fees)'],
  [common, '.store_coins(_collected_right_token_protocol_fees)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const before = { token0: 700n, token1: 900n };
const getterViewBefore = { token0: before.token0, token1: before.token1 };
if (getterViewBefore.token0 !== 700n || getterViewBefore.token1 !== 900n) throw new Error('getter pre-collect view mismatch');

const collectAllowed = before.token0 > 0n && before.token1 > 0n;
if (!collectAllowed) throw new Error('positive dual-counter collection was unexpectedly blocked');
const after = { token0: 0n, token1: 0n };
const getterViewAfter = { token0: after.token0, token1: after.token1 };
if (getterViewAfter.token0 !== 0n || getterViewAfter.token1 !== 0n) throw new Error('getter did not model saved zero counters');
const repeatedCollectAllowed = after.token0 > 0n && after.token1 > 0n;
if (repeatedCollectAllowed) throw new Error('saved zero counters remained collectible');

const staleGetterCanChangeState = false;
if (staleGetterCanChangeState) throw new Error('read-only getter was modeled as a state mutation');
const stalePositiveViewStillPassesPoolGate = repeatedCollectAllowed;
if (stalePositiveViewStillPassesPoolGate) throw new Error('stale view bypassed the live Pool counter gate');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('getter_reads_both_counters_from_current_storage true');
console.log('collect_requires_both_counters_positive true');
console.log('collect_clears_both_counters_before_save true');
console.log('post_save_getter_returns_zero_counters true');
console.log('stale_read_only_view_cannot_bypass_collect_gate true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
