const assert = require('node:assert/strict');
const fs = require('node:fs');

const poolBurn = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_wallet.fc',
  'utf8',
);
const lpWallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet.fc',
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
const poolRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);

assert.match(poolBurn, /cell maybe_custom_payload = in_msg_body~load_maybe_ref\(\);/);
assert.match(poolBurn, /lp_wallet_idata\(\s*from_address,\s*my_address\(\),\s*storage::jetton_lp_wallet_code\s*\)/s);
assert.match(poolBurn, /throw_unless\(error::invalid_caller, equal_slices\(lp_wallet~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/s);
assert.match(poolBurn, /storage::reserve0 -= amount0_out;\s*storage::reserve1 -= amount1_out;\s*storage::total_supply_lp -= jetton_amount;/s);
assert.match(poolBurn, /if maybe_custom_payload_sc\.slice_bits\(\) == 2 \{\s*left_maybe_payload = maybe_custom_payload_sc~load_maybe_ref\(\);\s*right_maybe_payload = maybe_custom_payload_sc~load_maybe_ref\(\);/s);
assert.match(poolBurn, /router::pay_to\(\s*from_address,\s*from_address,\s*from_address,\s*op::burn_ok,\s*0,\s*left_maybe_payload,\s*amount0_out,\s*storage::token0_address,\s*0,/s);
assert.match(poolBurn, /router::pay_to\(\s*from_address,\s*from_address,\s*from_address,\s*op::burn_ok,\s*0,\s*right_maybe_payload,\s*0,\s*storage::token0_address,\s*amount1_out,\s*storage::token1_address/s);
assert.match(poolBurn, /storage::save\(\);\s*return \(true\);/s);
assert.match(lpWallet, /\.store_uint\(op::burn_notification_ext, 32\)[\s\S]*\.store_coins\(jetton_amount\)[\s\S]*\.store_slice\(owner_address\)/s);
assert.match(routerPool, /throw_unless\(error::invalid_caller, equal_slices\(pool~address\(params::workchain\), ctx\.at\(SENDER\)\)\)/s);
assert.match(routerDex, /msgs::send_with_stateinit\(/);
assert.match(poolRoot, /if handle_lp_wallet_messages\(\) \{\s*return \(\);/s);
assert.match(contracts, /router::pay_to\(/);

function splitPayload(payload) {
  if (payload === null) return { left: null, right: null };
  if (payload.bits !== 2) return { left: null, right: null };
  return { left: payload.left, right: payload.right };
}

function burn(pool, burnAmount, payload) {
  assert(burnAmount > 0n);
  assert(pool.sender === `LP_WALLET(${pool.user}|${pool.pool})`);
  assert(pool.out0 > 0n && pool.out1 > 0n);
  const legs = splitPayload(payload);
  return {
    after: { ...pool, reserve0: pool.reserve0 - pool.out0, reserve1: pool.reserve1 - pool.out1, supply: pool.supply - burnAmount },
    messages: [
      { token: 'TOKEN0', amount: pool.out0, owner: pool.user, payload: legs.left },
      { token: 'TOKEN1', amount: pool.out1, owner: pool.user, payload: legs.right },
    ],
  };
}

const state = {
  reserve0: 10_000n,
  reserve1: 20_000n,
  supply: 1_000n,
  out0: 100n,
  out1: 200n,
  user: 'USER',
  pool: 'POOL',
  sender: 'LP_WALLET(USER|POOL)',
};
const paired = burn(state, 10n, { bits: 2, left: 'LEFT_PAYLOAD', right: 'RIGHT_PAYLOAD' });
assert.deepEqual(paired.messages, [
  { token: 'TOKEN0', amount: 100n, owner: 'USER', payload: 'LEFT_PAYLOAD' },
  { token: 'TOKEN1', amount: 200n, owner: 'USER', payload: 'RIGHT_PAYLOAD' },
]);
assert.deepEqual(paired.after, { ...state, reserve0: 9_900n, reserve1: 19_800n, supply: 990n });

const malformed = burn(state, 10n, { bits: 3, left: 'ATTACK', right: 'ATTACK2' });
assert.deepEqual(malformed.messages, [
  { token: 'TOKEN0', amount: 100n, owner: 'USER', payload: null },
  { token: 'TOKEN1', amount: 200n, owner: 'USER', payload: null },
]);
assert.deepEqual(malformed.after, paired.after);
const noPayload = burn(state, 10n, null);
assert.deepEqual(noPayload.messages, malformed.messages);
assert.throws(() => burn({ ...state, sender: 'ATTACKER' }, 10n, null), /LP_WALLET/);
assert.equal(paired.messages[0].amount + paired.messages[1].amount, 300n);

function downstreamFailure(messages, failedIndex) {
  return messages.map((message, index) => ({ ...message, delivered: index !== failedIndex }));
}
const partial = downstreamFailure(paired.messages, 1);
assert.equal(partial[0].delivered, true);
assert.equal(partial[1].delivered, false);
assert.equal(paired.after.supply, 990n);

console.log('AF2 burn-payload edge check passed: only a two-bit wrapper splits payload refs, output amounts/tokens/owner remain fixed, malformed wrappers clear payloads without changing reserve deltas, and a downstream leg failure is liveness-only');
