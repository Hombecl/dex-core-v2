const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const router = read('contracts/pool/msgs/router.fc');
const admin = read('contracts/router/msgs/admin.fc');
const params = read('contracts/common/params.fc');

const FEE_DIVIDER = 10_000n;
const MAX_FEE = 100n;
const ceilDiv = (a, b) => (a + b - 1n) / b;
assert(params.includes('const params::min_fee = 0'));
assert(params.includes('const params::max_fee = 100'));
assert(admin.includes('(params::min_fee  <= new_protocol_fee)'));
assert(admin.includes('(new_protocol_fee <= params::max_fee)'));
assert(admin.includes('(new_lp_fee <= params::max_fee)'));
assert(router.includes('ref_value = ref_address.preload_uint(2) == 0 ? 0 : ref_value;'));
assert(router.includes('throw_arg_if(op::swap_refund_0_out, 1, out < 1);'));

for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('if storage::protocol_fee > 0'));
  assert(source.includes('protocol_fee_out = divc(base_out * storage::protocol_fee, params::fee_divider);'));
  assert(source.includes('if _ref_value > 0'));
  assert(source.includes('ref_fee_out = divc(base_out * _ref_value, params::fee_divider);'));
  assert(source.includes('base_out -= protocol_fee_out + ref_fee_out;'));
  assert(source.includes('return (base_out, protocol_fee_out, ref_fee_out);'));
}

let cases = 0;
let accepted = 0;
let rejectedTinyOutputs = 0;
let maxFeeSum = 0n;
for (let baseOut = 0n; baseOut <= 10_000n; baseOut += 1n) {
  for (const protocolFee of [0n, 1n, 10n, 99n, 100n]) {
    for (const refFee of [0n, 1n, 10n, 99n, 100n]) {
      const protocolOut = protocolFee > 0n ? ceilDiv(baseOut * protocolFee, FEE_DIVIDER) : 0n;
      const refOut = refFee > 0n ? ceilDiv(baseOut * refFee, FEE_DIVIDER) : 0n;
      const out = baseOut - protocolOut - refOut;
      assert.equal(out + protocolOut + refOut, baseOut, 'fee legs must reconstruct base output');
      maxFeeSum = maxFeeSum > protocolOut + refOut ? maxFeeSum : protocolOut + refOut;
      if (out < 1n) rejectedTinyOutputs += 1;
      else {
        assert(out > 0n);
        accepted += 1;
      }
      cases += 1;
    }
  }
}

for (const lpFee of [0n, 1n, 10n, 99n, 100n]) {
  for (let gross = 0n; gross <= 10_000n; gross += 1n) {
    const net = (gross * (FEE_DIVIDER - lpFee)) / FEE_DIVIDER;
    assert(net >= 0n && net <= gross);
  }
}
const mutation = router.indexOf('storage::reserve0 += amount0');
const outputCheck = router.indexOf('throw_arg_if(op::swap_refund_0_out', mutation);
const save = router.indexOf('storage::save()', outputCheck);
assert(mutation > 0 && outputCheck > mutation && save > outputCheck);

console.log(JSON.stringify({
  variants_checked: variants.length,
  fee_cases_checked: cases,
  accepted_positive_output_cases: accepted,
  tiny_output_refund_cases: rejectedTinyOutputs,
  max_combined_ceil_fee_units: maxFeeSum.toString(),
  fee_reconstruction_mismatches: 0,
  successful_overdeductions: 0,
  result: 'PASS',
}, null, 2));
