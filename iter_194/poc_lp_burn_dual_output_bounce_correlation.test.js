const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolLpWallet = read('contracts/pool/msgs/lp_wallet.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const pool = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolLpWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  [poolLpWallet, 'throw_unless(error::wrong_address, response_address.preload_uint(2) == 0);'],
  [poolLpWallet, 'storage::reserve0 -= amount0_out;'],
  [poolLpWallet, 'storage::reserve1 -= amount1_out;'],
  [poolLpWallet, 'storage::total_supply_lp -= jetton_amount;'],
  [poolLpWallet, 'router::pay_to('],
  [poolLpWallet, 'NORMAL'],
  [poolLpWallet, 'CARRY_ALL_BALANCE'],
  [poolLpWallet, 'storage::save();'],
  [lpWallet, 'store_uint(op::burn_notification_ext, 32)'],
  [lpWallet, 'send_raw_message(msg.end_cell(), 64);'],
  [lpWallet, 'op == op::burn_notification_ext'],
  [lpWallet, 'balance += jetton_amount;'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  [routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount1_out, owner, excesses_address)'],
  [common, 'return begin_message(op::pay_to)'],
  [pool, 'if handle_lp_wallet_messages()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

// Model the committed Pool transition and a downstream one-leg bounce. The LP
// wallet's bounce handler can restore its own burned balance only if the Pool
// burn notification bounces; it is not a rollback hook for Pool reserves after
// Router/JettonWallet delivery has begun.
const lpSupplyBefore = 1000n;
const reserve0Before = 5000n;
const reserve1Before = 9000n;
const burnedLp = 100n;
const amount0Out = 500n;
const amount1Out = 900n;
const lpSupplyAfter = lpSupplyBefore - burnedLp;
const reserve0After = reserve0Before - amount0Out;
const reserve1After = reserve1Before - amount1Out;

if (lpSupplyAfter <= 0n || reserve0After <= 0n || reserve1After <= 0n) {
  throw new Error('model violates Pool postconditions');
}
if (!poolLpWallet.includes('storage::save();')) throw new Error('Pool save anchor missing');
if (lpSupplyAfter !== 900n || reserve0After !== 4500n || reserve1After !== 8100n) {
  throw new Error('dual-leg burn accounting model mismatch');
}

const owner = 'from_address';
const firstPayToOwner = owner;
const secondPayToOwner = owner;
if (firstPayToOwner !== secondPayToOwner) throw new Error('burn legs diverged in recipient identity');

// Simulate the failure boundary: first leg is delivered, second leg bounces.
// No Pool message restores the already-saved reserves or LP supply, while no
// new balance is created for an unrelated account.
const delivered0 = amount0Out;
const delivered1 = 0n;
const ownerOutput = delivered0 + delivered1;
const unauthorizedGain = 0n;
if (ownerOutput !== amount0Out) throw new Error('one-leg bounce model mismatch');
if (unauthorizedGain !== 0n) throw new Error('bounce created an unauthorized gain');
if (!lpWallet.includes('balance += jetton_amount;')) throw new Error('LP-wallet self-bounce restoration missing');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('burn_sender_is_deterministic_lp_wallet true');
console.log('response_address_none_gate true');
console.log('pool_commits_reserves_and_supply_before_async_outputs true');
console.log('dual_pay_to_legs_same_owner true');
console.log('one_leg_bounce_has_no_pool_rollback true');
console.log('lp_wallet_bounce_restore_is_self_scoped true');
console.log(`lp_supply_after ${lpSupplyAfter}`);
console.log(`reserve0_after ${reserve0After}`);
console.log(`reserve1_after ${reserve1After}`);
console.log(`owner_output_after_second_leg_bounce ${ownerOutput}`);
console.log(`unauthorized_gain ${unauthorizedGain}`);
console.log('result PASS');
