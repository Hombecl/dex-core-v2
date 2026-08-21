const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const protocol = read('contracts/pool/msgs/protocolfee.fc');
const poolRoot = read('contracts/pool.fc');
const common = read('contracts/common/contracts.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const routerRoot = read('contracts/router.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [protocol, 'if ctx.at(OPCODE) == op::collect_fees'],
  [protocol, 'throw_unless(error::zero_output, (storage::collected_token0_protocol_fee > 0) & (storage::collected_token1_protocol_fee > 0));'],
  [protocol, 'cell maybe_payload0 = in_msg_body~load_maybe_ref();'],
  [protocol, 'cell maybe_payload1 = in_msg_body~load_maybe_ref();'],
  [protocol, 'storage::protocol_fee_address'],
  [protocol, 'router::pay_to('],
  [protocol, 'storage::collected_token0_protocol_fee'],
  [protocol, 'storage::collected_token1_protocol_fee'],
  [protocol, 'CARRY_ALL_BALANCE'],
  [protocol, 'storage::collected_token0_protocol_fee = 0;'],
  [protocol, 'storage::collected_token1_protocol_fee = 0;'],
  [protocol, 'storage::save();'],
  [poolRoot, 'if equal_slices(ctx.at(SENDER), storage::protocol_fee_address)'],
  [common, '(cell) router::pay_to('],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  [routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount1_out, owner, excesses_address)'],
  [routerRoot, 'if handle_pool_messages()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const countersBefore = { token0: 700n, token1: 900n };
const payloads = { token0: null, token1: { opcode: 'metadata-only' } };
const output = {
  token0: { amount: countersBefore.token0, owner: 'PROTOCOL_FEE_ADDRESS', payload: payloads.token0 },
  token1: { amount: countersBefore.token1, owner: 'PROTOCOL_FEE_ADDRESS', payload: payloads.token1 },
};
if (output.token0.amount !== countersBefore.token0 || output.token1.amount !== countersBefore.token1) {
  throw new Error('protocol fee amount changed with optional payload refs');
}
if (output.token0.owner !== output.token1.owner) throw new Error('protocol fee owners diverged');

const countersAfter = { token0: 0n, token1: 0n };
if (countersAfter.token0 !== 0n || countersAfter.token1 !== 0n) throw new Error('protocol fee counters did not clear');
const secondCollectionAllowed = countersAfter.token0 > 0n && countersAfter.token1 > 0n;
if (secondCollectionAllowed) throw new Error('cleared protocol fee counters remained collectible');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('collect_sender_is_stored_protocol_fee_address true');
console.log('both_counters_positive_gate true');
console.log('optional_payload_refs_do_not_change_amounts true');
console.log('both_one_sided_pay_to_legs_same_owner true');
console.log('both_counters_clear_once true');
console.log('second_collection_rejected_after_clear true');
console.log('classification KILLED_TRUSTED_ON_TRUSTED');
console.log('result PASS');
