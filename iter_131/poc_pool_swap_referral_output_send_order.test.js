const assert = require('node:assert/strict');
const fs = require('node:fs');

const poolSwap = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/router.fc',
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
const vault = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/vault.fc',
  'utf8',
);
const contracts = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);

assert.match(poolSwap, /ref_fee_out0 = 0;\s*int ref_fee_out1 = 0;/s);
assert.match(poolSwap, /storage::reserve1 -= \(out1 \+ protocol_fee_out \+ ref_fee_out1\);/);
assert.match(poolSwap, /storage::reserve0 -= \(out0 \+ protocol_fee_out \+ ref_fee_out0\);/);
assert.match(poolSwap, /if \(ref_address\.preload_uint\(2\) != 0\) & \(ref_fee_out0 \+ ref_fee_out1 > 0\)/);
assert.match(poolSwap, /router::pay_vault\(\s*ref_address,\s*excesses_address,\s*ref_fee_out0,\s*storage::token0_address,\s*ref_fee_out1,\s*storage::token1_address\)/s);
assert.match(poolSwap, /\),\s*NORMAL\s*\);\s*\}\s*\s*msgs::send_simple\(/s);
assert.match(poolSwap, /router::pay_to\(\s*from_user_address,\s*to_address,\s*excesses_address,\s*op::swap_ok,/s);
assert.match(poolSwap, /\),\s*CARRY_ALL_BALANCE\s*\);\s*storage::save\(\);/s);
assert.match(routerPool, /vault_idata\(\s*owner,\s*amount0_out > 0 \? token0_address : token1_address,\s*my_address\(\)\s*\)/s);
assert.match(routerPool, /vault::deposit_ref_fee\(\s*amount0_out \+ amount1_out,\s*excesses_address\s*\)/s);
assert.match(routerPool, /throw_unless\(error::invalid_caller, equal_slices\(pool~address\(params::workchain\), ctx\.at\(SENDER\)\)/s);
assert.match(routerDex, /storage_fee::vault \+ gas::router::pay_vault \+ gas::vault::deposit_ref_fee/);
assert.match(vault, /storage::deposited_amount \+= in_msg_body~load_coins\(\);\s*storage::save\(\);/s);
assert.match(vault, /router::vault_pay_to\(\s*storage::deposited_amount,\s*storage::token_address,\s*storage::owner_address\)/s);
assert.match(contracts, /vault_idata\(slice _user_address, slice _token_address, slice _router_address\)/);

function swapAccounting(pool, direction, input, output, protocolFee, referralFee, referral) {
  assert(input > 0n && output > 0n);
  assert(protocolFee >= 0n && referralFee >= 0n);
  const next = { ...pool, reserves: { ...pool.reserves }, protocolFees: { ...pool.protocolFees } };
  const outputToken = direction === 'token0-to-token1' ? 'token1' : 'token0';
  const inputToken = direction === 'token0-to-token1' ? 'token0' : 'token1';
  next.reserves[inputToken] += input;
  next.reserves[outputToken] -= output + protocolFee + referralFee;
  next.protocolFees[outputToken] += protocolFee;
  assert(next.reserves[outputToken] > 0n);

  const messages = [];
  if (referral !== 'NONE' && referralFee > 0n) {
    messages.push({ op: 'pay_vault', owner: referral, token: outputToken, amount: referralFee, mode: 'NORMAL' });
  }
  messages.push({ op: 'pay_to', owner: 'TRADER', token: outputToken, amount: output, mode: 'CARRY_ALL_BALANCE' });
  return { saved: next, messages };
}

function vaultDeposit(vaultState, message, deliverySucceeded = true) {
  if (!deliverySucceeded) return { ...vaultState, delivered: false };
  assert.equal(message.op, 'pay_vault');
  return { ...vaultState, amount: vaultState.amount + message.amount, token: message.token, owner: message.owner, delivered: true };
}

function withdrawVault(state) {
  assert(state.amount > 0n);
  return {
    after: { ...state, amount: 0n },
    message: { op: 'vault_pay_to', amount: state.amount, token: state.token, owner: state.owner },
  };
}

const base = {
  reserves: { token0: 1_000n, token1: 2_000n },
  protocolFees: { token0: 0n, token1: 0n },
};

const forward = swapAccounting(base, 'token0-to-token1', 100n, 170n, 3n, 7n, 'REFERRER');
assert.deepEqual(forward.messages, [
  { op: 'pay_vault', owner: 'REFERRER', token: 'token1', amount: 7n, mode: 'NORMAL' },
  { op: 'pay_to', owner: 'TRADER', token: 'token1', amount: 170n, mode: 'CARRY_ALL_BALANCE' },
]);
assert.deepEqual(forward.saved.reserves, { token0: 1_100n, token1: 1_820n });
assert.equal(forward.saved.protocolFees.token1, 3n);
assert.equal(170n + 3n + 7n, 180n);

const reverse = swapAccounting(base, 'token1-to-token0', 200n, 80n, 2n, 5n, 'REFERRER');
assert.deepEqual(reverse.messages[0], { op: 'pay_vault', owner: 'REFERRER', token: 'token0', amount: 5n, mode: 'NORMAL' });
assert.deepEqual(reverse.messages[1], { op: 'pay_to', owner: 'TRADER', token: 'token0', amount: 80n, mode: 'CARRY_ALL_BALANCE' });
assert.deepEqual(reverse.saved.reserves, { token0: 913n, token1: 2_200n });

const noReferral = swapAccounting(base, 'token0-to-token1', 100n, 170n, 3n, 7n, 'NONE');
assert.equal(noReferral.messages.length, 1);
assert.equal(noReferral.messages[0].op, 'pay_to');

const stored = vaultDeposit({ amount: 0n, token: null, owner: null }, forward.messages[0]);
assert.deepEqual(stored, { amount: 7n, token: 'token1', owner: 'REFERRER', delivered: true });
const paid = withdrawVault(stored);
assert.deepEqual(paid.message, { op: 'vault_pay_to', amount: 7n, token: 'token1', owner: 'REFERRER' });
assert.equal(paid.after.amount, 0n);

const failedDelivery = vaultDeposit({ amount: 0n, token: null, owner: null }, forward.messages[0], false);
assert.equal(failedDelivery.delivered, false);
assert.equal(forward.saved.reserves.token1, 1_820n);
assert.equal(forward.messages[1].amount, 170n);

console.log('AE1 send-order edge check passed: referral and normal output legs are token/amount bound, reserve delta equals output plus protocol/referral fees, and vault withdrawal returns the exact stored tuple; downstream delivery failure is liveness-only in the model');
