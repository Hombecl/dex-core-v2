const assert = require('node:assert/strict');
const fs = require('node:fs');

const dex = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/dex.fc',
  'utf8',
);
const poolPayTo = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/pool.fc',
  'utf8',
);

assert.match(dex, /transferred_op = transferred_op == op::cross_swap \? op::swap : transferred_op;/);
assert.match(dex, /throw_arg_if\(op::transfer_bounce_invalid_pool, 1, equal_slices\(_jetton_address, token_wallet1\)\);/);
assert.match(dex, /throw_arg_unless\(op::transfer_bounce_wrong_wc, 1, _caller\.address::check_workchain\(params::workchain\)\);/);
assert.match(dex, /throw_arg_unless\(op::transfer_bounce_tx_expired, 1, tx_deadline > now\(\)\);/);
assert.match(dex, /msgs::send_with_stateinit\(\s*0,\s*pool~address\(params::workchain\),\s*pool~state_init\(\)/s);
assert.match(poolPayTo, /if \(tmp_custom_payload_ds\.slice_bits\(\) > 32\)/);
assert.match(poolPayTo, /if \(fwd_opcode == op::cross_swap\)\s*& \(ctx\.at\(MSG_VALUE\) > used_gas\)/s);
assert.match(poolPayTo, /slice sent_jetton_address = amount0_out > 0 \? token0_address : token1_address;/);
assert.match(poolPayTo, /int swap_amount = amount0_out \+ amount1_out;/);
assert.match(poolPayTo, /route_dex_messages\(sent_jetton_address, gas, swap_amount, original_caller, custom_payload\);/);

function routePayload({ bits, opcode, tokenIn, tokenOther, caller, deadlineOk, amount }) {
  if (amount <= 0n) return { kind: 'invalid_amount', amount: 0n };
  if (!deadlineOk || tokenIn === tokenOther) return { kind: 'refund', amount, to: caller };
  if (bits <= 32 || opcode !== 'cross_swap') return { kind: 'normal', amount, to: caller };
  return { kind: 'nested', amount, to: caller, token: tokenOther };
}

function payTo({ amount0, amount1, custom, caller = 'CALLER' }) {
  const amount = amount0 + amount1;
  const selected = amount0 > 0n ? 'TOKEN0' : 'TOKEN1';
  const usedGas = 10n;
  if (custom.bits > 32 && custom.opcode === 'cross_swap' && custom.msgValue > usedGas) {
    return routePayload({
      bits: custom.bits,
      opcode: custom.opcode,
      tokenIn: selected,
      tokenOther: custom.tokenOther,
      caller,
      deadlineOk: custom.deadlineOk,
      amount,
    });
  }
  return { kind: 'normal', amount, to: custom.owner, token: selected, tail: custom.tail };
}

const normal = payTo({
  amount0: 8n,
  amount1: 0n,
  custom: { bits: 32, opcode: 'cross_swap', msgValue: 100n, owner: 'OWNER', tail: ['arbitrary', 1] },
});
assert.deepEqual(normal, { kind: 'normal', amount: 8n, to: 'OWNER', token: 'TOKEN0', tail: ['arbitrary', 1] });

const nested = payTo({
  amount0: 0n,
  amount1: 8n,
  caller: 'ORIGINAL',
  custom: { bits: 96, opcode: 'cross_swap', msgValue: 100n, tokenOther: 'TOKEN2', deadlineOk: true, owner: 'IGNORED' },
});
assert.deepEqual(nested, { kind: 'nested', amount: 8n, to: 'ORIGINAL', token: 'TOKEN2' });

const malformedNested = payTo({
  amount0: 8n,
  amount1: 0n,
  caller: 'ORIGINAL',
  custom: { bits: 96, opcode: 'cross_swap', msgValue: 100n, tokenOther: 'TOKEN0', deadlineOk: true, owner: 'IGNORED' },
});
assert.deepEqual(malformedNested, { kind: 'refund', amount: 8n, to: 'ORIGINAL' });
assert.equal(nested.amount, 8n);
assert.equal(normal.amount, 8n);

console.log('AD3 route-tail edge check passed: exact 32-bit tails stay normal payloads, nested cross-swap keeps original caller and amount, and token/deadline guards refund malformed recursion');
