const assert = require('node:assert/strict');
const fs = require('node:fs');

const protocolFee = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/protocolfee.fc',
  'utf8',
);
const poolRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool.fc',
  'utf8',
);
const routerPool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/pool.fc',
  'utf8',
);
const routerDex = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/dex.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);

assert.match(protocolFee, /throw_unless\(error::zero_output, \(storage::collected_token0_protocol_fee > 0\) & \(storage::collected_token1_protocol_fee > 0\)\)/);
assert.match(protocolFee, /cell maybe_payload0 = in_msg_body~load_maybe_ref\(\);\s*cell maybe_payload1 = in_msg_body~load_maybe_ref\(\);\s*in_msg_body\.end_parse\(\);/s);
assert.match(protocolFee, /storage::collected_token0_protocol_fee,\s*storage::token0_address,\s*0,\s*storage::token1_address/s);
assert.match(protocolFee, /0,\s*storage::token0_address,\s*storage::collected_token1_protocol_fee,\s*storage::token1_address/s);
assert.match(protocolFee, /maybe_payload0,.*?\),\s*NORMAL/s);
assert.match(protocolFee, /maybe_payload1,.*?\),\s*CARRY_ALL_BALANCE/s);
assert.match(protocolFee, /storage::collected_token0_protocol_fee = 0;\s*storage::collected_token1_protocol_fee = 0;\s*\s*storage::save\(\);/s);
assert.match(poolRoot, /if equal_slices\(ctx\.at\(SENDER\), storage::protocol_fee_address\) \{\s*handle_protocolfee_messages\(\);/s);
assert.match(routerPool, /throw_unless\(error::invalid_caller, equal_slices\(pool~address\(params::workchain\), ctx\.at\(SENDER\)\)/s);
assert.match(routerDex, /var pool = contracts::from_sources\(\s*pool_idata\(/s);
assert.match(contracts, /router::pay_to\(\s*slice _original_caller/);

function collectFees(state, payload0, payload1) {
  if (state.fee0 <= 0n || state.fee1 <= 0n) throw new Error('zero_output');
  const messages = [
    { token: state.token0, amount: state.fee0, owner: state.protocol, payload: payload0, mode: 'NORMAL' },
    { token: state.token1, amount: state.fee1, owner: state.protocol, payload: payload1, mode: 'CARRY_ALL_BALANCE' },
  ];
  return { after: { ...state, fee0: 0n, fee1: 0n }, messages };
}

function routerAcceptsPayTo(message, sender, expectedPool) {
  assert.equal(sender, expectedPool);
  return { token: message.token, amount: message.amount, owner: message.owner, payload: message.payload };
}

const state = { fee0: 11n, fee1: 13n, token0: 'TOKEN0', token1: 'TOKEN1', protocol: 'PROTOCOL' };
const collected = collectFees(state, 'PAYLOAD0', 'PAYLOAD1');
assert.deepEqual(collected.messages, [
  { token: 'TOKEN0', amount: 11n, owner: 'PROTOCOL', payload: 'PAYLOAD0', mode: 'NORMAL' },
  { token: 'TOKEN1', amount: 13n, owner: 'PROTOCOL', payload: 'PAYLOAD1', mode: 'CARRY_ALL_BALANCE' },
]);
assert.deepEqual(collected.after, { ...state, fee0: 0n, fee1: 0n });
assert.deepEqual(routerAcceptsPayTo(collected.messages[0], 'POOL(TOKEN0,TOKEN1)', 'POOL(TOKEN0,TOKEN1)'), {
  token: 'TOKEN0', amount: 11n, owner: 'PROTOCOL', payload: 'PAYLOAD0',
});
assert.deepEqual(routerAcceptsPayTo(collected.messages[1], 'POOL(TOKEN0,TOKEN1)', 'POOL(TOKEN0,TOKEN1)'), {
  token: 'TOKEN1', amount: 13n, owner: 'PROTOCOL', payload: 'PAYLOAD1',
});

assert.throws(() => collectFees({ ...state, fee0: 0n }, null, null), /zero_output/);
assert.throws(() => routerAcceptsPayTo(collected.messages[0], 'ATTACKER', 'POOL(TOKEN0,TOKEN1)'), /POOL/);

const crossSwapPayload = { op: 'cross_swap', owner: 'PROTOCOL' };
const trustedOnly = collectFees(state, crossSwapPayload, null);
assert.equal(trustedOnly.messages[0].payload.op, 'cross_swap');
assert.equal(trustedOnly.messages[0].owner, state.protocol);
assert.equal(state.protocol, 'PROTOCOL');

function downstreamDelivery(message, succeeds) {
  return succeeds ? { paid: message.amount, owner: message.owner, token: message.token } : { paid: 0n, bounced: true };
}

const failedSecondLeg = downstreamDelivery(collected.messages[1], false);
assert.deepEqual(failedSecondLeg, { paid: 0n, bounced: true });
assert.equal(collected.after.fee1, 0n);
assert.equal(collected.messages[1].owner, state.protocol);

console.log('AE2 protocol-fee edge check passed: both counters are required, each message is one-sided and amount/token bound, counters clear exactly once after construction, and only the stored protocol-fee sender can choose custom payloads; a malformed trusted payload is trusted-on-trusted liveness/accounting griefing');
