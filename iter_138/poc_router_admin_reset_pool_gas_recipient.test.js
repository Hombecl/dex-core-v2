const assert = require('node:assert/strict');
const fs = require('node:fs');

const admin = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/admin.fc',
  'utf8',
);
const routerRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router.fc',
  'utf8',
);
const pool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool.fc',
  'utf8',
);
const poolRouter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/router.fc',
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

assert.match(admin, /if ctx\.at\(OPCODE\) == op::reset_pool_gas \{/);
assert.match(admin, /slice jetton_wallet0 = in_msg_body~load_msg_addr\(\);\s*slice jetton_wallet1 = in_msg_body~load_msg_addr\(\);\s*slice excesses_recipient = get_excesses_address\(in_msg_body~load_msg_addr\(\)\);/s);
assert.match(admin, /throw_unless\(error::wrong_workchain, jetton_wallet1\.address::check_workchain\(params::workchain\)\s*& jetton_wallet0\.address::check_workchain\(params::workchain\)\s*& excesses_recipient\.address::check_workchain\(params::workchain\)\)/s);
assert.match(admin, /pool::reset_gas\(excesses_recipient\)/);
assert.match(admin, /pool_idata\(my_address\(\), jetton_wallet0, jetton_wallet1, storage::jetton_lp_wallet_code,  storage::lp_account_code\)/);
assert.match(routerRoot, /if equal_slices\(ctx\.at\(SENDER\), storage::admin_address\) \{\s*if handle_admin_messages\(\) \{/s);
assert.match(pool, /if equal_slices\(ctx\.at\(SENDER\), storage::router_address\) \{\s*handle_router_messages\(\);/s);
assert.match(poolRouter, /if ctx\.at\(OPCODE\) == op::reset_gas \{\s*reserves::exact\(storage_fee::pool\);\s*utils::send_excesses\(0, in_msg_body~load_msg_addr\(\), QCARRY_ALL_BALANCE\);/s);
assert.match(contracts, /\(cell\) pool::reset_gas\(slice _excesses_recipient\)/);
assert.match(utils, /_addr = _addr\.address::is_none\(\) \? ctx\.at\(SENDER\) : _addr;/);

function resetPoolGas(request, state) {
  if (request.sender !== state.admin) throw new Error('not_admin');
  if (request.wallet0.wc !== 0 || request.wallet1.wc !== 0 || request.recipient.wc !== 0) throw new Error('wrong_workchain');
  const recipient = request.recipient.none ? request.sender : request.recipient.address;
  const derivedPool = `POOL(${state.router}|${request.wallet0.address}|${request.wallet1.address})`;
  return {
    poolMessage: { sender: state.router, recipient: derivedPool, excesses: recipient },
    after: { ...state },
  };
}

function poolReset(message, state) {
  if (message.sender !== state.router) throw new Error('wrong_router');
  return { tonRecipient: message.excesses, after: { ...state } };
}

const state = {
  admin: 'ADMIN', router: 'ROUTER', reserve0: 1000n, reserve1: 2000n, supply: 500n,
};
const request = {
  sender: 'ADMIN',
  wallet0: { address: 'W0', wc: 0 },
  wallet1: { address: 'W1', wc: 0 },
  recipient: { address: 'EXCESS', wc: 0, none: false },
};
const sent = resetPoolGas(request, state);
assert.deepEqual(sent.poolMessage, {
  sender: 'ROUTER', recipient: 'POOL(ROUTER|W0|W1)', excesses: 'EXCESS',
});
assert.deepEqual(poolReset(sent.poolMessage, state), { tonRecipient: 'EXCESS', after: state });
assert.deepEqual(sent.after, state);

const fallback = resetPoolGas({ ...request, recipient: { none: true, wc: 0 } }, state);
assert.equal(fallback.poolMessage.excesses, 'ADMIN');
assert.throws(() => resetPoolGas({ ...request, sender: 'ATTACKER' }, state), /not_admin/);
assert.throws(() => resetPoolGas({ ...request, wallet0: { address: 'W0', wc: 1 } }, state), /wrong_workchain/);
assert.throws(() => poolReset({ ...sent.poolMessage, sender: 'ATTACKER' }, state), /wrong_router/);
assert.deepEqual(state, { admin: 'ADMIN', router: 'ROUTER', reserve0: 1000n, reserve1: 2000n, supply: 500n });

console.log('AF3 reset-pool-gas edge check passed: only the stored admin reaches the Router branch, the pool sender is fixed to the stored Router, workchains and deterministic pool tuple are checked, and the operation moves TON excess only');
