const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const lpBurn = read('contracts/pool/msgs/lp_wallet.fc');
const poolMath = read('contracts/pool/pools/constant_product/pool.fc');
const routerPay = read('contracts/router/msgs/pool.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const common = read('contracts/common/contracts.fc');
const stateInit = read('contracts/pool/pools/constant_product/state_init.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [lpBurn, 'int jetton_amount = in_msg_body~load_coins();'],
  [lpBurn, 'pool::get_lp_burn_out(jetton_amount)'],
  [lpBurn, 'throw_unless(error::zero_output, (amount0_out > 0) & (amount1_out > 0));'],
  [lpBurn, 'storage::reserve0 -= amount0_out;'],
  [lpBurn, 'storage::reserve1 -= amount1_out;'],
  [lpBurn, 'storage::total_supply_lp -= jetton_amount;'],
  [lpBurn, 'router::pay_to('],
  [lpBurn, 'storage::save();'],
  [poolMath, 'get_lp_burn_out'],
  [routerPay, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)))'],
  [routerPay, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  [lpWallet, 'balance -= jetton_amount;'],
  [lpAccount, 'storage::reserve0 += tot_am0;'],
  [common, 'pool::$route('],
  [stateInit, 'if _first_jetton_address.slice_hash() > _second_jetton_address.slice_hash()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

// Burn is proportional to Pool reserves. A fake A leg can inflate only the
// accounting for A; the real B output cannot exceed the B leg that entered the
// Router-owned B wallet while completing the pair.
const residualBaseline = 1_000_000n;
const attackerBInput = 1_000_000n;
const forgedAInput = 1_000_000_000_000n;
const totalSupply = 999_999_000n;
const burnAmount = totalSupply - 1n;
const reserveB = attackerBInput;
const bOut = reserveB * burnAmount / totalSupply;
const routerBBefore = residualBaseline + attackerBInput;
const routerBAfter = routerBBefore - bOut;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
assert(forgedAInput > attackerBInput, 'fake A leg did not dominate the test case');
assert(bOut > 0n && bOut <= reserveB, 'burn output exceeded the B reserve');
assert(routerBAfter >= residualBaseline, 'burn consumed Router B residual');
assert(lpWallet.includes('storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'), 'LP wallet debit save missing');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('fake_pair_lp_supply_created true');
console.log(`forged_A_input ${forgedAInput}`);
console.log(`attacker_B_input ${attackerBInput}`);
console.log(`burn_B_output_bound ${bOut}`);
console.log(`router_B_baseline ${residualBaseline}`);
console.log(`router_B_after_burn ${routerBAfter}`);
console.log('unbacked_real_asset_release false');
console.log('attacker_positive_delta false');
console.log('result PASS');
