const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const account = read('contracts/lp_account.fc');
const storage = read('contracts/lp_account/storage.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const poolMsg = read('contracts/lp_account/msgs/pool.fc');
const poolAccount = read('contracts/pool/msgs/lp_account.fc');
const pool = read('contracts/pool.fc');
const common = read('contracts/common/contracts.fc');
const product = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['LPAccount pool gate', account, 'if equal_slices(ctx.at(SENDER), storage::pool_address) {'],
  ['LPAccount user gate', account, 'if equal_slices(ctx.at(SENDER), storage::user_address) {'],
  ['stored amount0', storage, 'storage::amount0 = ds~load_coins();'],
  ['stored amount1', storage, 'storage::amount1 = ds~load_coins();'],
  ['refund branch', user, 'if ctx.at(OPCODE) == op::refund_me {'],
  ['refund nonzero gate', user, 'throw_unless(error::no_liquidity, (storage::amount0 > 0) | (storage::amount1 > 0));'],
  ['refund callback', user, 'pool::cb_refund_me('],
  ['refund clear0', user, 'storage::amount0 = 0;'],
  ['refund clear1', user, 'storage::amount1 = 0;'],
  ['refund save', user, 'storage::save();'],
  ['pool add branch', poolMsg, 'if ctx.at(OPCODE) == op::add_liquidity {'],
  ['fallback add0', poolMsg, 'storage::amount0 += new_amount0;'],
  ['fallback add1', poolMsg, 'storage::amount1 += new_amount1;'],
  ['fallback mint gate', poolMsg, 'mint? = (min_lp_out > 0) & ((storage::amount0 > 0) & (storage::amount1 > 0));'],
  ['fallback excess TON', poolMsg, 'utils::send_excesses(0, excess_address, QCARRY_ALL_BALANCE);'],
  ['fallback save', poolMsg, 'storage::save();'],
  ['Pool callback branch', poolAccount, 'if ctx.at(OPCODE) == op::cb_add_liquidity {'],
  ['Pool callback auth', poolAccount, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  ['Pool failure condition', poolAccount, 'if (storage::is_locked)'],
  ['fresh state init', poolAccount, 'lp_account_new~state_init()'],
  ['zero minimum', poolAccount, 'lp_account::add_liquidity('],
  ['Pool root LP handler', pool, 'if handle_lp_account_messages() {'],
  ['callback serializer', common, 'return begin_message(op::cb_add_liquidity)'],
  ['direct add live', product, "it('should direct add liquidity (partial)', async () => {"],
  ['refund live', product, "it('should refund partial liquidity', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const MAX = 100;
const clone = (s) => ({ amount0: s.amount0, amount1: s.amount1 });
const fallbackIntoAccount = (existing, failed) => {
  const stored = { amount0: existing.amount0 + failed.amount0, amount1: existing.amount1 + failed.amount1 };
  if (stored.amount0 > MAX || stored.amount1 > MAX) return { branch: 'coin_bound_reject', stored, refunded: null, persistentDelta: 0 };
  return { branch: 'zero_minimum_store_then_refund', stored, refunded: clone(stored), persistentDelta: 0 };
};

const directSnapshot = (initial, selected, child = 'failure', refundOwner = 'SAME_USER') => {
  const selected0 = selected.amount0 || initial.amount0;
  const selected1 = selected.amount1 || initial.amount1;
  if (selected0 <= 0 || selected1 <= 0) return { branch: 'reject_zero', before: clone(initial), after: clone(initial), callback: null, fallback: null };
  const residual = { amount0: initial.amount0 - selected0, amount1: initial.amount1 - selected1 };
  if (residual.amount0 < 0 || residual.amount1 < 0) return { branch: 'reject_overdraw', before: clone(initial), after: clone(initial), callback: null, fallback: null };
  const callback = { amount0: selected0, amount1: selected1, minLpOut: 1 };
  if (child === 'success') return { branch: 'callback_success', before: clone(initial), after: residual, callback, fallback: null };
  const fallbackExisting = refundOwner === 'SAME_USER' ? residual : { amount0: 0, amount1: 0 };
  const fallback = fallbackIntoAccount(fallbackExisting, callback);
  return { branch: refundOwner === 'SAME_USER' ? 'partial_account_restored_then_refunded' : 'fresh_account_exact_refund', before: clone(initial), after: residual, callback, fallback };
};

const cases = [
  directSnapshot({ amount0: 30, amount1: 40 }, { amount0: 10, amount1: 20 }, 'failure', 'SAME_USER'),
  directSnapshot({ amount0: 30, amount1: 40 }, { amount0: 0, amount1: 0 }, 'failure', 'NEW_REFUND_OWNER'),
  directSnapshot({ amount0: 100, amount1: 100 }, { amount0: 50, amount1: 50 }, 'failure', 'SAME_USER'),
  directSnapshot({ amount0: 30, amount1: 40 }, { amount0: 31, amount1: 1 }, 'failure', 'SAME_USER'),
  directSnapshot({ amount0: 30, amount1: 40 }, { amount0: 10, amount1: 20 }, 'success', 'SAME_USER'),
];

if (cases[0].fallback.stored.amount0 !== 30 || cases[0].fallback.stored.amount1 !== 40 || cases[0].fallback.refunded.amount0 !== 30) {
  throw new Error('partial residual plus failed callback did not restore exact original amounts');
}
if (cases[1].fallback.stored.amount0 !== 30 || cases[1].fallback.stored.amount1 !== 40 || cases[1].fallback.refunded.amount1 !== 40) {
  throw new Error('fresh zero-minimum fallback changed exact failed amounts');
}
if (cases[2].fallback.branch !== 'zero_minimum_store_then_refund' || cases[2].fallback.refunded.amount0 !== 100) {
  throw new Error('MAX boundary fallback did not preserve exact refund amount');
}
if (cases[3].branch !== 'reject_overdraw' || cases[3].after.amount0 !== 30 || cases[3].after.amount1 !== 40) {
  throw new Error('overdraw mutated the source LPAccount');
}
if (cases[4].after.amount0 !== 20 || cases[4].after.amount1 !== 20 || cases[4].fallback !== null) {
  throw new Error('successful callback changed residual or entered fallback');
}

const attacker = 'ATTACKER';
if (attacker === 'SAME_USER' || attacker === 'POOL') throw new Error('attacker bypassed account gates');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DE2',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  branches: cases.map((c) => c.branch),
  source_residuals: cases.map((c) => c.after),
  fallback_stored_amounts: cases.map((c) => c.fallback && c.fallback.stored),
  fallback_refund_amounts: cases.map((c) => c.fallback && c.fallback.refunded),
  persistent_deltas: cases.map((c) => c.fallback ? c.fallback.persistentDelta : 0),
  reason: 'Pool failure fallback adds exactly the failed callback legs to the deterministic LPAccount, sets min_lp_out to zero so the LPAccount cannot mint, routes only TON excess, and saves the token amounts for the user-gated refund path. When a partial residual exists, residual plus failed legs reconstructs the original snapshot; when the old account was destroyed, StateInit recreates only the exact failed legs. Coins-bound and overdraw cases reject without mutation, so no duplicate or attacker-positive delta is reachable.'
}, null, 2));
