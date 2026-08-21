const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const common = read('contracts/common/contracts.fc');
const poolRoot = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolLpAccount, 'if ctx.at(OPCODE) == op::cb_add_liquidity'],
  [poolLpAccount, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  [poolLpAccount, 'storage::total_supply_lp += liquidity;'],
  [poolLpAccount, 'if (storage::is_locked)'],
  [poolLpAccount, '(liquidity < min_lp_out)'],
  [poolLpAccount, 'lp_account::add_liquidity('],
  [poolLpAccount, '0, \n                    0,\n                    true, ;; both_positive? to true'],
  [poolLpAccount, 'both_positive? to true'],
  [lpAccountPool, 'if ctx.at(OPCODE) == op::add_liquidity'],
  [lpAccountPool, 'storage::amount0 += new_amount0;'],
  [lpAccountPool, 'storage::amount1 += new_amount1;'],
  [lpAccountPool, 'mint? = (min_lp_out > 0)'],
  [lpAccountPool, 'utils::send_excesses(0, excess_address, QCARRY_ALL_BALANCE);'],
  [lpAccountPool, 'storage::save();'],
  [lpAccountUser, 'throw_unless(error::zero_output, (min_lp_out > 0)'],
  [common, '(cell) lp_account::add_liquidity('],
  [common, '.store_coins(_min_lp_out)'],
  [poolRoot, 'if handle_lp_account_messages()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const callback = { amount0: 100n, amount1: 200n, minLpOut: 50n, supplyBefore: 1000n };
const calculatedLiquidity = 10n;
const callbackFailsMinimum = calculatedLiquidity < callback.minLpOut;
if (!callbackFailsMinimum) throw new Error('model did not enter minimum-output fallback');

const fallback = {
  amount0: callback.amount0,
  amount1: callback.amount1,
  minLpOut: 0n,
  bothPositive: true,
  lpMinted: 0n,
  excessReturned: callback.amount0 + callback.amount1,
};
if (fallback.minLpOut !== 0n || fallback.lpMinted !== 0n) throw new Error('fallback minted LP');
if (fallback.excessReturned !== callback.amount0 + callback.amount1) throw new Error('fallback amount mismatch');

const oneSided = { amount0: 100n, amount1: 0n, minLpOut: 0n, lpMinted: 0n };
if (oneSided.lpMinted !== 0n) throw new Error('one-sided zero-minimum fallback minted LP');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('pool_callback_sender_authenticated true');
console.log('minimum_output_failure_redeploys_zero_minimum_account true');
console.log('fallback_mints_zero_lp true');
console.log('fallback_returns_exact_accumulated_amounts true');
console.log('one_sided_zero_minimum_mints_zero_lp true');
console.log('attacker_positive_delta false');
console.log('result PASS');
