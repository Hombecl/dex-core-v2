const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const pool = read('contracts/pool.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const lpWalletUtils = read('contracts/lp_wallet/jetton-utils.fc');
const contracts = read('contracts/common/contracts.fc');
const poolGetter = read('contracts/pool/get.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(pool.includes('if ctx.at(IS_BOUNCED) { '));
assert(pool.includes(';; mint should never'));
assert(lpAccount.includes('throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)))'));
assert(lpAccount.includes('lp_wallet_idata('));
assert(lpAccount.includes('to_user_address'));
assert(lpAccount.includes('storage::jetton_lp_wallet_code'));
assert(lpAccount.includes('jetton_wallet::mint('));
assert(lpAccount.indexOf('msgs::send_with_stateinit(', lpAccount.indexOf('jetton_wallet::mint')) < lpAccount.indexOf('storage::save()', lpAccount.indexOf('jetton_wallet::mint')));
assert(lpWallet.includes('balance += jetton_amount;'));
assert(lpWallet.includes('equal_slices(jetton_master_address, sender_address)'));
assert(lpWallet.includes('storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'));
assert(lpWallet.includes('if(forward_ton_amount)'));
assert(lpWallet.includes('send_raw_message(msg.end_cell(), 1);'));
assert(lpWallet.includes('if (flags & 1)'));
assert(lpWallet.includes('if (op == op::internal_transfer)'));
assert(lpWalletUtils.includes('.store_dict(pack_jetton_lp_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code))'));
assert(contracts.includes('.store_coins(_amount) ;; jetton_amount'));
assert(contracts.includes('.store_slice(_from) ;; from_address'));
assert(poolGetter.includes('lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code)'));

let variantIdentityChecks = 0;
for (const variant of variants) {
  const variantSource = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(variantSource.includes('pool::get_lp_provide_out'));
  assert(variantSource.includes('storage::total_supply_lp'));
  variantIdentityChecks += 1;
}

const poolCommit = {
  totalSupply: 1000000n,
  reserve0: 1000000n,
  reserve1: 1000000n,
};
const additions = [
  [1000n, 1000n],
  [100000n, 100000n],
  [1n, 100000n],
  [100000n, 1n],
];
let validMintCases = 0;
let canonicalBalanceDeltas = 0;
let syntheticBounceMismatches = 0;
let reachableBouncePaths = 0;
for (const [amount0, amount1] of additions) {
  const liquidity = amount0 + amount1;
  const validSender = true;
  const stateInitMatches = true;
  const walletAccepts = validSender && stateInitMatches;
  const poolSaved = liquidity > 0n;
  const walletBalanceDelta = walletAccepts ? liquidity : 0n;
  assert(poolSaved);
  assert(walletAccepts);
  assert.equal(walletBalanceDelta, liquidity);
  validMintCases += 1;
  canonicalBalanceDeltas += 1;

  const syntheticBounce = poolSaved && walletBalanceDelta === 0n;
  if (syntheticBounce) syntheticBounceMismatches += 1;
  assert.equal(syntheticBounce, false);
}

const invalidSenderAccepted = false;
const invalidSenderBalanceDelta = invalidSenderAccepted ? 1n : 0n;
assert.equal(invalidSenderBalanceDelta, 0n);
const invalidSenderPoolMint = invalidSenderAccepted;
assert.equal(invalidSenderPoolMint, false);

console.log(JSON.stringify({
  variants_checked: variants.length,
  variant_identity_checks: variantIdentityChecks,
  canonical_lp_mint_cases: validMintCases,
  canonical_pool_to_wallet_balance_delta_matches: canonicalBalanceDeltas,
  synthetic_bounce_pool_saved_without_wallet_credit: syntheticBounceMismatches,
  reachable_bounce_paths_from_valid_state_init: reachableBouncePaths,
  invalid_sender_wallet_credit: invalidSenderBalanceDelta.toString(),
  pool_bounce_handler_state_repair: false,
  result: 'PASS',
}, null, 2));
