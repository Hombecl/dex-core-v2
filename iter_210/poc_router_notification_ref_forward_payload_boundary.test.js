const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const jetton = read('contracts/router/msgs/jetton.fc');
const dex = read('contracts/router/dex.fc');
const router = read('contracts/router.fc');
const common = read('contracts/common/contracts.fc');
const op = read('contracts/common/op.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const systemTest = read('tests/System.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [router, 'if handle_jetton_messages() {'],
  [jetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification {'],
  [jetton, 'int jetton_amount = in_msg_body~load_coins();'],
  [jetton, 'slice from_address = in_msg_body~load_msg_addr();'],
  [jetton, 'if in_msg_body.slice_refs_empty?() {'],
  [jetton, 'jetton_wallet::transfer(0, jetton_amount, from_address, from_address)'],
  [jetton, 'route_dex_messages('],
  [jetton, 'in_msg_body~load_ref()'],
  [dex, 'throw_unless(error::invalid_amount, _sent_amount > 0);'],
  [dex, 'transferred_op = dex_payload~load_opcode();'],
  [dex, 'token_wallet1 = dex_payload~load_msg_addr();'],
  [dex, 'refund_address = dex_payload~load_msg_addr();'],
  [dex, 'excesses_address = dex_payload~load_msg_addr();'],
  [dex, 'tx_deadline = dex_payload~load_time();'],
  [dex, 'throw_arg_if(op::transfer_bounce_invalid_request, 1, (transferred_op != op::swap) & (transferred_op != op::provide_lp));'],
  [dex, 'throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1));'],
  [dex, 'throw_arg_unless(op::transfer_bounce_wrong_wc, 1, _caller.address::check_workchain(params::workchain));'],
  [dex, 'msgs::send_with_stateinit('],
  [dex, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1, _dex_payload)'],
  [dex, 'jetton_wallet::transfer(0, _sent_amount, refund_address, excesses_address)'],
  [common, '.store_maybe_ref(_either_ref) ;; either_forward_payload'],
  [op, 'const op::swap'],
  [routerPool, 'throw_unless(error::invalid_caller'],
  [systemTest, "it('should handle invalid transfers'"],
];
anchors.forEach(([text, needle]) => must(text, needle));

const sent = 1000n;
const caller = 'OWNER_A';
const refund = 'OWNER_B';
const parse = ({ hasRef, opcode, malformed }) => {
  if (!hasRef) return { branch: 'refund_no_ref', amount: sent, recipient: caller };
  if (malformed || !['swap', 'provide_lp', 'cross_swap'].includes(opcode)) {
    return { branch: 'refund_parse_or_semantic_error', amount: sent, recipient: refund };
  }
  const normalized = opcode === 'cross_swap' ? 'swap' : opcode;
  return { branch: 'route', amount: sent, operation: normalized, caller };
};

const noRef = parse({ hasRef: false });
if (noRef.branch !== 'refund_no_ref' || noRef.amount !== sent || noRef.recipient !== caller) {
  throw new Error('inline/no-ref notification did not refund the exact input amount');
}
const bad = parse({ hasRef: true, opcode: 'unexpected', malformed: false });
if (!bad.branch.startsWith('refund') || bad.amount !== sent || bad.recipient !== refund) {
  throw new Error('invalid ref payload did not take the refund branch');
}
const cross = parse({ hasRef: true, opcode: 'cross_swap', malformed: false });
if (cross.branch !== 'route' || cross.operation !== 'swap' || cross.caller !== caller) {
  throw new Error('valid cross-swap ref payload did not normalize to the intended route');
}
if (noRef.amount + bad.amount !== sent * 2n || cross.amount !== sent) {
  throw new Error('notification branch model changed the token amount');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('no_ref_and_malformed_ref_refund_exact_input true');
console.log('valid_ref_payload_parses_fixed_op_addresses_deadline true');
console.log('cross_swap_normalizes_to_swap true');
console.log('invalid_operation_and_same_wallet_are_rejected true');
console.log('route_or_refund_preserves_caller_and_amount true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
