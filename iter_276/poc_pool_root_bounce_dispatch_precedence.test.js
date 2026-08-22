const assert = require('node:assert/strict');

// Faithful model of contracts/pool.fc's dispatch order for the DG3 boundary.
function poolRootDispatch({ bodyEmpty, isBounced, senderRole, opcode }) {
  if (bodyEmpty) return { branch: 'empty_body_reject', stateMutation: false, outbound: false };
  if (isBounced) return { branch: 'ignored_bounce_no_state_change', stateMutation: false, outbound: false };
  if (senderRole === 'protocol_fee') return { branch: 'protocolfee_handler', stateMutation: true, outbound: true };
  if (senderRole === 'router') return { branch: 'router_handler', stateMutation: true, outbound: true };
  if (senderRole === 'lp_wallet') return { branch: 'lp_wallet_handler', stateMutation: true, outbound: true };
  if (senderRole === 'lp_account') return { branch: 'lp_account_handler', stateMutation: true, outbound: true };
  return { branch: opcode ? 'getter_or_wrong_op' : 'wrong_op', stateMutation: false, outbound: false };
}

const cases = [
  ['bounced Router pay_to callback', { bodyEmpty: false, isBounced: true, senderRole: 'router', opcode: 'pay_to' }],
  ['bounced LPWallet callback', { bodyEmpty: false, isBounced: true, senderRole: 'lp_wallet', opcode: 'burn_notification_ext' }],
  ['bounced LPAccount callback', { bodyEmpty: false, isBounced: true, senderRole: 'lp_account', opcode: 'cb_add_liquidity' }],
  ['normal Router callback', { bodyEmpty: false, isBounced: false, senderRole: 'router', opcode: 'swap' }],
  ['normal outsider callback', { bodyEmpty: false, isBounced: false, senderRole: 'outsider', opcode: 'swap' }],
  ['empty bounced body', { bodyEmpty: true, isBounced: true, senderRole: 'router', opcode: 'pay_to' }],
];

for (const [label, input] of cases) {
  const result = poolRootDispatch(input);
  if (input.bodyEmpty) assert.equal(result.branch, 'empty_body_reject', label);
  else if (input.isBounced) assert.equal(result.branch, 'ignored_bounce_no_state_change', label);
  else if (input.senderRole === 'router') assert.equal(result.branch, 'router_handler', label);
  else assert.equal(result.stateMutation, false, label);
  if (input.isBounced) {
    assert.equal(result.stateMutation, false, label);
    assert.equal(result.outbound, false, label);
  }
}

assert.equal(
  poolRootDispatch({ bodyEmpty: false, isBounced: true, senderRole: 'router', opcode: 'arbitrary_attacker_body' }).stateMutation,
  false,
);
console.log(`PASS ${cases.length} Pool root dispatch cases; bounced persistent attacker delta = 0`);
