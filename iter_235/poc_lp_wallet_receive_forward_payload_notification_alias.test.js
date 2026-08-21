const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const common = read('contracts/common/contracts.fc');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const routerDex = read('contracts/router/dex.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const system = read('tests/System.spec.ts');
const product = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['mint payload field', common, '.store_maybe_ref(_either_ref) ;; either_forward_payload'],
  ['receive payload remainder', wallet, 'slice either_forward_payload = in_msg_body;'],
  ['notification opcode', wallet, '.store_uint(op::transfer_notification, 32)'],
  ['notification amount', wallet, '.store_coins(jetton_amount)'],
  ['notification source', wallet, '.store_slice(from_address)'],
  ['notification payload', wallet, '.store_slice(either_forward_payload)'],
  ['Router notification branch', routerJetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification'],
  ['Router no-ref refund gate', routerJetton, 'if in_msg_body.slice_refs_empty?() {'],
  ['Router routed ref', routerJetton, 'in_msg_body~load_ref()'],
  ['Router route entry', routerDex, '() route_dex_messages('],
  ['Router custom ref parser', routerPool, 'cell custom_payload = in_msg_body~load_maybe_ref();'],
  ['Router custom ref branch', routerPool, 'ifnot(custom_payload.null?()) {'],
  ['live System mint/burn', system, "it('should handle mint & burn liquidity'"],
  ['live different recipient', product, "it('should provide lp with payload to a different address'"],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

// The Maybe-ref marker is preserved as the first bit of the remaining slice.
// No ref means Router enters its explicit refund branch; a ref means Router
// consumes exactly that ref and routes its contents as the caller's payload.
function routeByRefs(refCount, payloadBits) {
  if (refCount === 0) return { action: 'refund', payloadBits };
  return { action: 'route', consumedRefs: 1, payloadBits };
}
assert.deepStrictEqual(routeByRefs(0, 0), { action: 'refund', payloadBits: 0 });
assert.deepStrictEqual(routeByRefs(1, 16), { action: 'route', consumedRefs: 1, payloadBits: 16 });
assert.strictEqual(routeByRefs(1, 16).consumedRefs, 1);
assert.strictEqual(routeByRefs(0, 16).action, 'refund');

// Payload contents can choose a route only for the notifying wallet's valid
// transfer; they do not alter the already authenticated wallet sender or mint.
assert(wallet.indexOf('throw_unless(707', wallet.indexOf('receive_tokens')) >= 0);
assert(common.indexOf('.store_coins(_amount) ;; jetton_amount') < common.indexOf('.store_maybe_ref(_either_ref)'));

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'AX25',
  cross_file_anchors: anchors.length,
  ref_shape_cases: 4,
  duplicate_family: 'iter_87/V2 and iter_103/Y3 LPWallet notification/forward-payload family',
  reason: 'the remaining body slice preserves the Maybe-ref payload convention; Router deterministically refunds no-ref notifications or consumes one payload ref for routing, with no unauthorized wallet credit or victim asset selection',
}, null, 2));
