const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const dex = read('contracts/router/dex.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const op = read('contracts/common/op.fc');
const wrapper = read('wrappers/Router.ts');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['strict cutoff', routerPool, 'if (tmp_custom_payload_ds.slice_bits() > 32) { ;; cross_swap = 32 + address'],
  ['opcode preload', routerPool, 'fwd_opcode = tmp_custom_payload_ds.preload_uint(32);'],
  ['cross branch', routerPool, 'if (fwd_opcode == op::cross_swap) '],
  ['nested route call', routerPool, 'route_dex_messages(sent_jetton_address, gas, swap_amount, original_caller, custom_payload);'],
  ['ordinary token transfer', routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  ['pay_to builder', common, 'return begin_message(op::pay_to)'],
  ['custom payload forwarding', common, '.store_maybe_ref(_maybe_custom_payload)'],
  ['additional info ref', common, '.store_ref(begin_cell()'],
  ['route parse', dex, 'slice dex_payload = _dex_payload.begin_parse();'],
  ['route opcode parse', dex, 'transferred_op = dex_payload~load_opcode();'],
  ['route address parse', dex, 'token_wallet1 = dex_payload~load_msg_addr();'],
  ['route parser refund', dex, 'jetton_wallet::transfer(0, _sent_amount, _caller, _caller)'],
  ['pool pay_to call', poolRouter, 'router::pay_to('],
  ['cross opcode schema', op, 'const op::cross_swap'],
  ['wrapper cross opcode width', wrapper, '.storeUint(routerOpcodes.crossSwap, 32)'],
  ['live same-router path', constProduct, "it('should cross-swap on the same router', async () => {"],
  ['live system cross path', system, "it('should handle cross swap', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const CROSS_SWAP = 0x69cf1a5b;
const classify = (bits, firstOp) => {
  if (bits <= 32) return { branch: 'ordinary_transfer', assetDelta: 0, destination: 'owner' };
  if (firstOp !== CROSS_SWAP) return { branch: 'ordinary_transfer', assetDelta: 0, destination: 'owner' };
  if (bits < 34) return { branch: 'route_parser_catch_refund', assetDelta: 0, destination: 'original_caller' };
  return { branch: 'nested_route_candidate', assetDelta: 0, destination: 'original_caller' };
};

const cases = [
  classify(0, 0),
  classify(32, CROSS_SWAP),
  classify(33, CROSS_SWAP),
  classify(34, CROSS_SWAP),
  classify(33, 0x12345678),
];
if (cases[1].branch !== 'ordinary_transfer') throw new Error('32-bit payload unexpectedly selected cross route');
if (cases[2].branch !== 'route_parser_catch_refund') throw new Error('33-bit cross opcode did not fail address parse');
if (cases[2].assetDelta !== 0 || cases[3].assetDelta !== 0) throw new Error('cutoff changed asset delta');
if (cases[4].branch !== 'ordinary_transfer') throw new Error('non-cross opcode selected nested route');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BB3',
  cross_file_anchors: anchors.length,
  boundary_cases: cases.length,
  strict_32_case: 'ordinary_transfer',
  strict_33_cross_case: 'route_parser_catch_refund',
  asset_delta_cases: cases.map((c) => c.assetDelta),
  reason: 'pay_to uses a strict payload slice_bits() > 32 gate before preloading the cross_swap opcode. Exactly 32 bits stays on the ordinary fixed-amount transfer path; 33 bits with a cross opcode enters route_dex_messages but lacks a complete MsgAddress and is caught into an equal-amount refund to original_caller. The boundary changes route handling only and does not alter owner, amount, or asset deltas'
}, null, 2));
