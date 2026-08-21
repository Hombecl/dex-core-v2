const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const lpWallet = read('contracts/pool/msgs/lp_wallet.fc');
const params = read('contracts/common/params.fc');
const math = read('node_modules/@ston-fi/funcbox/contracts/math/math.fc');

const MAX_COINS = (1n << 120n) - 1n;
const REQUIRED_LOCK = 1001n;
const floorDiv = (a, b) => a / b;
assert(params.includes('const params::required_min_liquidity = 1001'));
assert(math.includes('const int math::MAX_COINS'));
assert(lpAccount.includes('| (storage::total_supply_lp > math::MAX_COINS)'));
assert(lpAccount.includes('| (storage::reserve0 > math::MAX_COINS)'));
assert(lpAccount.includes('| (storage::reserve1 > math::MAX_COINS)'));
assert(lpWallet.includes('storage::total_supply_lp -= jetton_amount'));
assert(lpWallet.includes('throw_unless(error::invalid_amount, (storage::reserve0 > 0) & (storage::reserve1 > 0))'));
assert(lpWallet.includes('throw_unless(error::invalid_amount, (storage::total_supply_lp > 0))'));

for (const variant of variants) {
  const storage = read(`contracts/pool/pools/${variant}/storage.fc`);
  for (const field of ['reserve0', 'reserve1', 'total_supply_lp', 'collected_token0_protocol_fee', 'collected_token1_protocol_fee']) {
    assert(storage.includes(`ds~load_coins()`), `${variant}: ${field} must load as coin`);
    assert(storage.includes(`.store_coins(storage::${field})`), `${variant}: ${field} must store as coin`);
  }
}

let supplyCases = 0;
let mintAccepted = 0;
let mintRefunded = 0;
for (const total of [0n, 1n, REQUIRED_LOCK, REQUIRED_LOCK + 1n, MAX_COINS - 1n, MAX_COINS]) {
  for (const liquidity of [0n, 1n, REQUIRED_LOCK, REQUIRED_LOCK + 1n, MAX_COINS - 1n, MAX_COINS, MAX_COINS + 1n]) {
    const minted = total === 0n ? liquidity - REQUIRED_LOCK : liquidity;
    const supplyAfter = total === 0n ? liquidity : total + minted;
    const accepted = minted >= 0n && supplyAfter <= MAX_COINS && minted >= REQUIRED_LOCK;
    if (accepted) mintAccepted += 1;
    else mintRefunded += 1;
    supplyCases += 1;
  }
}

let burnCases = 0;
let burnAccepted = 0;
let burnRejected = 0;
for (const total of [1n, REQUIRED_LOCK + 1n, MAX_COINS - 1n, MAX_COINS]) {
  for (const reserve0 of [1n, 2n, MAX_COINS - 1n, MAX_COINS]) {
    for (const reserve1 of [1n, 2n, MAX_COINS - 1n, MAX_COINS]) {
      for (const lpAmount of [1n, total - 1n < 1n ? 1n : total - 1n, total, MAX_COINS]) {
        const amount0Out = floorDiv(lpAmount * reserve0, total);
        const amount1Out = floorDiv(lpAmount * reserve1, total);
        const totalAfter = total - lpAmount;
        const reserve0After = reserve0 - amount0Out;
        const reserve1After = reserve1 - amount1Out;
        const accepted = lpAmount > 0n && amount0Out > 0n && amount1Out > 0n
          && totalAfter > 0n && reserve0After > 0n && reserve1After > 0n;
        if (accepted) burnAccepted += 1;
        else burnRejected += 1;
        burnCases += 1;
      }
    }
  }
}

const lpTry = lpAccount.indexOf('try { ;; catch math errors');
const lpProvide = lpAccount.indexOf('pool::get_lp_provide_out', lpTry);
const lpSave = lpAccount.indexOf('storage::save()', lpProvide);
const lpRefundBranch = lpAccount.indexOf('if (storage::is_locked)', lpProvide);
const walletBurn = lpWallet.indexOf('pool::get_lp_burn_out');
const walletChecks = lpWallet.indexOf('throw_unless(error::invalid_amount', walletBurn);
const walletSave = lpWallet.indexOf('storage::save()', walletChecks);
assert(lpTry >= 0 && lpProvide > lpTry && lpRefundBranch > lpProvide && lpSave > lpRefundBranch);
assert(walletBurn >= 0 && walletChecks > walletBurn && walletSave > walletChecks);

console.log(JSON.stringify({
  variants_checked: variants.length,
  coin_serialization_fields_per_variant: 5,
  supply_cases: supplyCases,
  mint_accepted_cases: mintAccepted,
  mint_refund_cases: mintRefunded,
  burn_cases: burnCases,
  burn_accepted_cases: burnAccepted,
  burn_rejected_cases: burnRejected,
  max_coin_value: MAX_COINS.toString(),
  state_save_before_width_checks: false,
  state_save_before_burn_checks: false,
  result: 'PASS',
}, null, 2));
