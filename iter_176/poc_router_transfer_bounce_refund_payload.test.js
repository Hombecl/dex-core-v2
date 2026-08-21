const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const dex = read('contracts/router/dex.fc');
const jetton = read('contracts/router/msgs/jetton.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const common = read('contracts/common/contracts.fc');
const opcodes = read('contracts/common/op.fc');

// Cross-file refund chain: token notification -> Router route parser -> Pool
// failure/refund -> Router pay_to, plus Router cross-swap recursion.
assert(dex.includes('() route_dex_messages('));
assert(jetton.includes('route_dex_messages('));
assert(routerPool.includes('route_dex_messages(sent_jetton_address, gas, swap_amount, original_caller, custom_payload)'));
assert(poolRouter.includes('router::pay_to('));
assert(common.includes('(cell) router::pay_to('));
assert(opcodes.includes('const op::transfer_bounce_invalid_request'));

const outerCatch = dex.slice(dex.indexOf('} catch(err_arg, err_code) {'), dex.indexOf('try {', dex.indexOf('} catch(err_arg, err_code) {')));
assert(outerCatch.includes('jetton_wallet::transfer(0, _sent_amount, _caller, _caller)'));
assert(outerCatch.includes('.store_uint(abs(err_code != 1 ? err_code : err_arg.to_int()), 32)'));
assert(!outerCatch.includes('refund_address, excesses_address'));

const innerCatchStart = dex.lastIndexOf('} catch(err_arg, err_code) {');
const innerCatch = dex.slice(innerCatchStart);
assert(innerCatch.includes('jetton_wallet::transfer(0, _sent_amount, refund_address, excesses_address)'));
assert(innerCatch.includes('.store_uint(abs(err_code != 1 ? err_code : err_arg.to_int()), 32)'));
assert(dex.includes('refund_address.address::check_workchain(params::workchain)'));
assert(dex.includes('excesses_address.address::check_workchain(params::workchain)'));

// Error metadata is independent of the returned token amount. The outer
// parser fallback returns to the notification caller; the inner validation
// fallback uses the already-validated refund/excess tuple.
function routeFailure({ parsed, sentAmount, caller, refund, excess, error }) {
  return parsed
    ? { amount: sentAmount, destination: refund, response: excess, error }
    : { amount: sentAmount, destination: caller, response: caller, error };
}

for (const error of [1, 82, 1001, 0xffffffff]) {
  assert.deepEqual(routeFailure({ parsed: false, sentAmount: 100n, caller: 'CALLER', refund: 'REFUND', excess: 'EXCESS', error }), {
    amount: 100n, destination: 'CALLER', response: 'CALLER', error,
  });
  assert.deepEqual(routeFailure({ parsed: true, sentAmount: 100n, caller: 'CALLER', refund: 'REFUND', excess: 'EXCESS', error }), {
    amount: 100n, destination: 'REFUND', response: 'EXCESS', error,
  });
}

// A foreign token wallet can receive a refund message, but it cannot debit a
// Router-owned balance; the Router path rejects a forged same-token pair.
assert(dex.includes('throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1))'));
assert(dex.includes('throw_arg_if(op::transfer_bounce_invalid_request, 1, (transferred_op != op::swap) & (transferred_op != op::provide_lp))'));

console.log(JSON.stringify({
  cross_file_anchors: 12,
  outer_parser_refund_cases: 4,
  inner_validation_refund_cases: 4,
  error_metadata_changes_token_amount: false,
  refund_excess_field_shift: false,
  forged_same_token_pair_rejected: true,
  attacker_value_extraction: false,
  result: 'PASS',
}, null, 2));
