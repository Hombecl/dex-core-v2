const assert = require('node:assert/strict');
const fs = require('node:fs');

const ceilDiv = (n, d) => (n + d - 1n) / d;
const feeAdjustedOut = (baseOut, protocolFee, referralFee) =>
  baseOut - ceilDiv(baseOut * protocolFee, 10000n) - ceilDiv(baseOut * referralFee, 10000n);

// Small base outputs can become zero/negative after ceil-rounded fees.
assert.equal(feeAdjustedOut(1n, 0n, 100n), 0n);
assert.equal(feeAdjustedOut(1n, 100n, 100n), -1n);
assert.ok(feeAdjustedOut(1n, 100n, 100n) < 1n);

const source = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/router.fc',
  'utf8',
);
const zeroOutput = source.indexOf('throw_arg_if(op::swap_refund_0_out, 1, out < 1);');
const successSave = source.indexOf('storage::save();', zeroOutput);
const catchBlock = source.indexOf('} catch(err_arg, err_code) {', zeroOutput);
assert.ok(zeroOutput >= 0);
assert.ok(successSave > zeroOutput);
assert.ok(catchBlock > zeroOutput);
const catchBodyEnd = source.indexOf('if ctx.at(OPCODE) == op::provide_lp', catchBlock);
assert.ok(catchBodyEnd > catchBlock);
assert.equal(source.slice(catchBlock, catchBodyEnd).includes('storage::save();'), false);
assert.match(source.slice(catchBlock), /router::pay_to\(\s*from_user_address,\s*refund_address,\s*excesses_address/s);
assert.match(source.slice(catchBlock), /amount0,\s*storage::token0_address,\s*amount1,\s*storage::token1_address/s);

console.log('AC2 fee-rounding edge check passed: zero/negative output is rejected and original input is refunded');
