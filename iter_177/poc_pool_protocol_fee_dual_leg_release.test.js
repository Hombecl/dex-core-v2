const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const protocolFee = read('contracts/pool/msgs/protocolfee.fc');
const poolRoot = read('contracts/pool.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const opcodes = read('contracts/common/op.fc');
const testSource = read('tests/WeightedCPI.spec.ts');

// Cross-file chain: stored protocol-fee role -> Pool collect_fees -> two
// one-sided Router pay_to messages -> deterministic token-wallet routes.
assert(poolRoot.includes('if equal_slices(ctx.at(SENDER), storage::protocol_fee_address)'));
assert(protocolFee.includes('if ctx.at(OPCODE) == op::collect_fees'));
assert(protocolFee.includes('(storage::collected_token0_protocol_fee > 0) & (storage::collected_token1_protocol_fee > 0)'));
assert(protocolFee.includes('router::pay_to('));
assert(protocolFee.includes('storage::collected_token0_protocol_fee'));
assert(protocolFee.includes('storage::collected_token1_protocol_fee'));
assert(protocolFee.includes('storage::collected_token0_protocol_fee = 0;'));
assert(protocolFee.includes('storage::collected_token1_protocol_fee = 0;'));
assert(protocolFee.includes('storage::save();'));
assert(routerPool.includes('throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)))'));
assert(common.includes('(cell) router::pay_to('));
assert(opcodes.includes('const op::collect_fees'));
assert(testSource.includes("it('should collect fees'"));

function collect(state, caller) {
  assert.equal(caller, state.protocolFeeAddress);
  assert(state.fee0 > 0n && state.fee1 > 0n);
  return {
    messages: [
      { token: state.token0, amount: state.fee0 },
      { token: state.token1, amount: state.fee1 },
    ],
    after: { ...state, fee0: 0n, fee1: 0n },
  };
}

const state = { protocolFeeAddress: 'PROTOCOL_ROLE', token0: 'TOKEN_A', token1: 'TOKEN_B', fee0: 11n, fee1: 17n };
const result = collect(state, 'PROTOCOL_ROLE');
assert.deepEqual(result.messages, [
  { token: 'TOKEN_A', amount: 11n },
  { token: 'TOKEN_B', amount: 17n },
]);
assert.equal(result.after.fee0, 0n);
assert.equal(result.after.fee1, 0n);

for (const oneSided of [{ ...state, fee1: 0n }, { ...state, fee0: 0n }]) {
  assert.throws(() => collect(oneSided, 'PROTOCOL_ROLE'));
}
assert.throws(() => collect(state, 'ATTACKER'));

console.log(JSON.stringify({
  cross_file_anchors: 13,
  dual_positive_fee_case_checked: true,
  one_sided_zero_gate_cases: 2,
  untrusted_caller_rejected: true,
  counters_cleared_after_two_messages: true,
  attacker_value_extraction: false,
  trusted_on_trusted_only: true,
  result: 'PASS',
}, null, 2));
