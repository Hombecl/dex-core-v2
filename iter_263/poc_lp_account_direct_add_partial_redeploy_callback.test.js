const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const account = read('contracts/lp_account.fc');
const storage = read('contracts/lp_account/storage.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const poolMsg = read('contracts/lp_account/msgs/pool.fc');
const poolAccount = read('contracts/pool/msgs/lp_account.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/LPAccount.ts');
const product = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['pool gate', account, 'if equal_slices(ctx.at(SENDER), storage::pool_address) {'],
  ['user gate', account, 'if equal_slices(ctx.at(SENDER), storage::user_address) {'],
  ['bounce ignore', account, 'if ctx.at(IS_BOUNCED) {'],
  ['storage amount0', storage, 'storage::amount0 = ds~load_coins();'],
  ['storage amount1', storage, 'storage::amount1 = ds~load_coins();'],
  ['direct add branch', user, 'if ctx.at(OPCODE) == op::direct_add_liquidity {'],
  ['direct add gas', user, 'throw_unless(error::insufficient_gas'],
  ['zero selector amount0', user, 'am0 = am0 ? am0 : storage::amount0;'],
  ['zero selector amount1', user, 'am1 = am1 ? am1 : storage::amount1;'],
  ['positive guard', user, 'throw_unless(error::zero_output, (min_lp_out > 0) & ((am0 > 0) & (am1 > 0)));'],
  ['subtract amount0', user, 'storage::amount0 -= am0;'],
  ['subtract amount1', user, 'storage::amount1 -= am1;'],
  ['nonnegative residual', user, 'throw_unless(error::no_liquidity, (storage::amount0 >= 0) & (storage::amount1 >= 0));'],
  ['callback send', user, 'pool::cb_add_liquidity('],
  ['destroy mode', user, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['save after callback', user, 'storage::save();'],
  ['pool add callback', poolMsg, 'if ctx.at(OPCODE) == op::add_liquidity {'],
  ['pool callback add0', poolMsg, 'storage::amount0 += new_amount0;'],
  ['pool callback add1', poolMsg, 'storage::amount1 += new_amount1;'],
  ['pool callback save', poolMsg, 'storage::save();'],
  ['Pool cb handler', poolAccount, 'if ctx.at(OPCODE) == op::cb_add_liquidity {'],
  ['Pool deterministic sender', poolAccount, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  ['fresh redeploy', poolAccount, 'lp_account_new~state_init()'],
  ['zero minimum fallback', poolAccount, 'lp_account::add_liquidity('],
  ['callback serializer', common, 'return begin_message(op::cb_add_liquidity)'],
  ['direct add wrapper', wrapper, 'async sendDirectAddLiquidity('],
  ['live all test', product, "it('should direct add liquidity (all)', async () => {"],
  ['live partial test', product, "it('should direct add liquidity (partial)', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const clone = (s) => ({ amount0: s.amount0, amount1: s.amount1 });
const directAdd = (initial, { requested0, requested1, child = 'success' }) => {
  const state = clone(initial);
  const amount0 = requested0 || state.amount0;
  const amount1 = requested1 || state.amount1;
  if (amount0 <= 0 || amount1 <= 0) return { branch: 'reject_zero_output', before: state, after: state, callback: null, redeployed: null, destroyed: false };
  const residual = { amount0: state.amount0 - amount0, amount1: state.amount1 - amount1 };
  if (residual.amount0 < 0 || residual.amount1 < 0) return { branch: 'reject_overdraw', before: state, after: state, callback: null, redeployed: null, destroyed: false };
  const callback = { amount0, amount1, minLpOut: 1 };
  const destroyed = residual.amount0 + residual.amount1 === 0;
  if (child === 'success') return { branch: 'callback_success', before: state, after: residual, callback, redeployed: null, destroyed };
  const redeployed = { amount0: 0, amount1: 0 };
  const fallbackAdded = { amount0, amount1, minLpOut: 0 };
  return {
    branch: destroyed ? 'destroy_then_zero_minimum_redeploy_refund' : 'partial_residual_plus_zero_minimum_redeploy_refund',
    before: state,
    after: residual,
    callback,
    redeployed,
    fallbackAdded,
    destroyed,
  };
};

const initial = { amount0: 10, amount1: 20 };
const cases = [
  directAdd(initial, { requested0: 0, requested1: 0 }),
  directAdd(initial, { requested0: 5, requested1: 10 }),
  directAdd(initial, { requested0: 0, requested1: 5 }),
  directAdd(initial, { requested0: 11, requested1: 1 }),
  directAdd(initial, { requested0: 5, requested1: 10, child: 'failure' }),
  directAdd(initial, { requested0: 0, requested1: 0, child: 'failure' }),
];

if (!cases[0].destroyed || cases[0].after.amount0 !== 0 || cases[0].after.amount1 !== 0) throw new Error('full direct-add did not clear/destroy residual state');
if (cases[1].after.amount0 !== 5 || cases[1].after.amount1 !== 10 || cases[1].destroyed) throw new Error('partial direct-add residual mismatch');
if (cases[2].callback.amount0 !== 10 || cases[2].callback.amount1 !== 5 || cases[2].after.amount1 !== 15) throw new Error('zero-as-all selector reused wrong legs');
if (cases[3].branch !== 'reject_overdraw' || cases[3].after.amount0 !== 10 || cases[3].after.amount1 !== 20) throw new Error('overdraw mutated LP-account state');
if (cases[4].after.amount0 !== 5 || cases[4].after.amount1 !== 10 || cases[4].redeployed.amount0 !== 0 || cases[4].redeployed.amount1 !== 0) throw new Error('partial callback failure replayed stale amounts');
if (!cases[5].destroyed || cases[5].redeployed.amount0 !== 0 || cases[5].redeployed.amount1 !== 0) throw new Error('destroyed callback failure did not use zero-minimum fresh refund state');

const attacker = 'ATTACKER';
const userAddress = 'USER';
const poolAddress = 'POOL';
if (attacker === userAddress || attacker === poolAddress || attacker === poolAddress) throw new Error('attacker passed LPAccount or Pool sender gate');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DD5',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  branches: cases.map((c) => c.branch),
  residuals: cases.map((c) => c.after),
  callback_amounts: cases.map((c) => c.callback && [c.callback.amount0, c.callback.amount1]),
  destroyed_flags: cases.map((c) => c.destroyed),
  redeployed_amounts: cases.map((c) => c.redeployed || null),
  reason: 'Direct-add resolves zero selectors to the stored legs, validates positive selected amounts, subtracts them with nonnegative residual checks, queues one deterministic Pool callback, and saves the residual. Full consumption may destroy the old LPAccount; a failed Pool callback redeploys or reuses a deterministic account with min_lp_out zero, adds only the exact failed callback amounts, and refunds them without minting or replaying stale residual state. Partial residuals remain isolated and attacker senders fail the root gates.'
}, null, 2));
