const assert = require('node:assert/strict');
const fs = require('node:fs');

const poolRouter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/router.fc',
  'utf8',
);
const poolRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool.fc',
  'utf8',
);
const routerAdmin = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/admin.fc',
  'utf8',
);
const routerRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);
const utils = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/utils.fc',
  'utf8',
);

assert.match(poolRouter, /if ctx\.at\(OPCODE\) == op::reset_gas \{\s*reserves::exact\(storage_fee::pool\);\s*utils::send_excesses\(0, in_msg_body~load_msg_addr\(\), QCARRY_ALL_BALANCE\);/s);
assert.match(poolRoot, /if equal_slices\(ctx\.at\(SENDER\), storage::router_address\) \{\s*handle_router_messages\(\);/s);
assert.match(routerAdmin, /slice excesses_recipient = get_excesses_address\(in_msg_body~load_msg_addr\(\)\);\s*in_msg_body\.end_parse\(\);/s);
assert.match(routerAdmin, /pool::reset_gas\(excesses_recipient\)/);
assert.match(routerRoot, /if handle_pool_messages\(\) \{\s*return \(\);/s);
assert.match(contracts, /\(cell\) pool::reset_gas\(slice _excesses_recipient\)/);
assert.match(utils, /_addr = _addr\.address::is_none\(\) \? ctx\.at\(SENDER\) : _addr;/);

function poolReset(message, state) {
  if (message.sender !== state.router) throw new Error('wrong_router');
  const recipient = message.recipient;
  return { after: { ...state }, tonRecipient: recipient, ignoredTail: message.tail };
}

const state = { router: 'ROUTER', reserve0: 1000n, reserve1: 2000n, supply: 500n, token0: 'T0', token1: 'T1' };
const exact = poolReset({ sender: 'ROUTER', recipient: 'ADMIN', tail: null }, state);
assert.deepEqual(exact, { after: state, tonRecipient: 'ADMIN', ignoredTail: null });
const tail = poolReset({ sender: 'ROUTER', recipient: 'ROUTER', tail: { attacker: 'ATTACKER', extra: 99n } }, state);
assert.equal(tail.tonRecipient, 'ROUTER');
assert.deepEqual(tail.after, state);
assert.deepEqual(state, { router: 'ROUTER', reserve0: 1000n, reserve1: 2000n, supply: 500n, token0: 'T0', token1: 'T1' });
assert.throws(() => poolReset({ sender: 'ATTACKER', recipient: 'ATTACKER', tail: null }, state), /wrong_router/);

function adminBuild(recipient, sender) {
  if (sender !== 'ADMIN') throw new Error('not_admin');
  return { sender: 'ROUTER', recipient: recipient ?? sender, tail: null };
}
assert.deepEqual(adminBuild(null, 'ADMIN'), { sender: 'ROUTER', recipient: 'ADMIN', tail: null });
assert.deepEqual(adminBuild('ROUTER', 'ADMIN'), { sender: 'ROUTER', recipient: 'ROUTER', tail: null });
assert.throws(() => adminBuild('ATTACKER', 'ATTACKER'), /not_admin/);

console.log('AF4 reset-gas parser edge check passed: Pool accepts only the stored Router, the recipient is the already-parsed Router/admin tuple, trailing body data cannot affect token state, and the handler moves carried TON only');
