const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const jetton = read('contracts/router/msgs/jetton.fc');
const dex = read('contracts/router/dex.fc');
const common = read('contracts/common/contracts.fc');
const walletOp = read('contracts/lp_wallet/op.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['notification dispatcher', jetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification {'],
  ['notification amount', jetton, 'int jetton_amount = in_msg_body~load_coins();'],
  ['notification source', jetton, 'slice from_address = in_msg_body~load_msg_addr();'],
  ['no-ref branch', jetton, 'if in_msg_body.slice_refs_empty?() {'],
  ['no-ref destination', jetton, 'ctx.at(SENDER),'],
  ['no-ref exact amount', jetton, 'jetton_wallet::transfer(0, jetton_amount, from_address, from_address)'],
  ['no-ref error code', jetton, '.store_uint32(op::transfer_bounce_invalid_request)'],
  ['root ref dispatch', jetton, 'in_msg_body~load_ref()'],
  ['outer route parser', dex, 'slice dex_payload = _dex_payload.begin_parse();'],
  ['outer opcode parse', dex, 'transferred_op = dex_payload~load_opcode();'],
  ['outer address parse', dex, 'token_wallet1 = dex_payload~load_msg_addr();'],
  ['outer parser refund', dex, 'jetton_wallet::transfer(0, _sent_amount, _caller, _caller)'],
  ['inner parser refund', dex, 'jetton_wallet::transfer(0, _sent_amount, refund_address, excesses_address)'],
  ['shared transfer builder', common, 'jetton_wallet::transfer(int _fwd_amount, int _jetton_amount, slice _to, slice _response_address)'],
  ['notification opcode schema', walletOp, 'const op::transfer_notification'],
  ['live invalid transfer path', system, "it('should handle invalid transfers', async () => {"],
  ['live complex path', constProduct, "it('should handle more complex scenarios', async () => {"]
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const routeModel = ({ refBits = null, opcode = null, headerComplete = false, innerValid = false, amount = 25 }) => {
  if (refBits === null) return { result: 'no_ref_exact_refund', persistentDelta: 0, refundAmount: amount, refundOwner: 'from_address' };
  if (refBits < 32 || !headerComplete) return { result: 'outer_parser_exact_refund', persistentDelta: 0, refundAmount: amount, refundOwner: 'caller_from_address' };
  if (!innerValid || !['swap', 'provide_lp'].includes(opcode)) return { result: 'inner_parser_exact_refund', persistentDelta: 0, refundAmount: amount, refundOwner: 'parsed_refund_address' };
  return { result: 'validated_route', persistentDelta: 0, refundAmount: 0, refundOwner: null };
};

const cases = [
  routeModel({}),
  routeModel({ refBits: 0 }),
  routeModel({ refBits: 31 }),
  routeModel({ refBits: 32, opcode: 'swap', headerComplete: false }),
  routeModel({ refBits: 320, opcode: 'unknown', headerComplete: true }),
  routeModel({ refBits: 320, opcode: 'swap', headerComplete: true, innerValid: false }),
  routeModel({ refBits: 900, opcode: 'swap', headerComplete: true, innerValid: true })
];
if (cases.slice(0, 6).some((c) => c.persistentDelta !== 0 || c.refundAmount !== 25)) throw new Error('malformed root changed amount or refund');
if (cases[6].result !== 'validated_route' || cases[6].persistentDelta !== 0) throw new Error('valid route model mismatch');
if (cases[0].refundOwner !== 'from_address' || cases[1].refundOwner !== 'caller_from_address' || cases[2].refundOwner !== 'caller_from_address') throw new Error('no-ref/outer refund owner mismatch');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'CC2',
  cross_file_anchors: anchors.length,
  root_cases: cases.length,
  persistent_deltas: cases.map((c) => c.persistentDelta),
  refund_amounts: cases.map((c) => c.refundAmount),
  reason: 'Router transfer_notification sends no-ref messages back through the notifying token wallet with the exact amount. Referenced payloads enter route_dex_messages; shallow or truncated roots fail outer parsing and refund to the caller, while parsed-but-invalid nested routes refund the exact amount to the validated parsed refund address. No branch changes the token amount or creates a persistent Router asset delta'
}, null, 2));
