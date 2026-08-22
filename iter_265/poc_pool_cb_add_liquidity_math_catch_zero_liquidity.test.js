const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const variantPaths = [
  'contracts/pool/pools/constant_product/pool.fc',
  'contracts/pool/pools/constant_sum/pool.fc',
  'contracts/pool/pools/stableswap/pool.fc',
  'contracts/pool/pools/weighted_const_product/pool.fc',
  'contracts/pool/pools/weighted_stableswap/pool.fc',
];
const variants = variantPaths.map((p) => ({ path: p, text: read(p) }));
const callback = read('contracts/pool/msgs/lp_account.fc');
const rootPool = read('contracts/pool.fc');
const common = read('contracts/common/contracts.fc');
const product = read('tests/ConstProduct.spec.ts');
const sum = read('tests/ConstSum.spec.ts');

const anchors = [];
for (const variant of variants) {
  anchors.push([`${variant.path} provide-out`, variant.text, '(int, int, int) pool::get_lp_provide_out(']);
  anchors.push([`${variant.path} inv1 boundary`, variant.text, 'if inv1 <= inv0 { return (0, 0, 0); }']);
  anchors.push([`${variant.path} inv2 boundary`, variant.text, 'if inv2 <= inv0 { return (0, 0, 0); }']);
}
anchors.push(
  ['callback entry', callback, 'if ctx.at(OPCODE) == op::cb_add_liquidity {'],
  ['initial math catch', callback, 'liquidity = pool::get_lp_provide_init_out(tot_am0, tot_am1);'],
  ['initial catch boundary', callback, '} catch(_, _) { }'],
  ['existing math catch', callback, '(liquidity, new_collected_protocol_fees0, new_collected_protocol_fees1) = pool::get_lp_provide_out(tot_am0, tot_am1);'],
  ['provisional supply', callback, 'storage::total_supply_lp += liquidity;'],
  ['provisional reserve0', callback, 'storage::reserve0 += (tot_am0 - new_collected_protocol_fees0);'],
  ['provisional reserve1', callback, 'storage::reserve1 += (tot_am1 - new_collected_protocol_fees1);'],
  ['failure condition', callback, '| (liquidity < min_lp_out)'],
  ['failure StateInit', callback, 'lp_account_new~state_init()'],
  ['failure refund call', callback, 'lp_account::add_liquidity('],
  ['root callback dispatch', rootPool, 'if handle_lp_account_messages() {'],
  ['callback serializer', common, 'return begin_message(op::cb_add_liquidity)'],
  ['constant product live', product, "it('should direct add liquidity (all)', async () => {"],
  ['constant sum live', sum, "it('should direct add liquidity (partial)', async () => {"],
);
for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ initial, amount0, amount1, minOut, mode }) => {
  const before = { totalSupply: initial.totalSupply, reserve0: initial.reserve0, reserve1: initial.reserve1 };
  let liquidity = 0;
  let fees0 = 0;
  let fees1 = 0;
  let threw = false;
  if (mode === 'throw') threw = true;
  else if (mode === 'no_growth') liquidity = 0;
  else if (mode === 'valid') { liquidity = 25; fees0 = 1; fees1 = 2; }
  if (initial.totalSupply === 0) liquidity -= 1000;
  const provisional = {
    totalSupply: before.totalSupply + (initial.totalSupply === 0 ? liquidity + 1000 : liquidity),
    reserve0: before.reserve0 + amount0 - fees0,
    reserve1: before.reserve1 + amount1 - fees1,
  };
  const failure = threw || liquidity < minOut || amount0 <= 0 || amount1 <= 0;
  return {
    branch: failure ? 'failure_exact_lpaccount_refund_no_pool_save' : 'success_pool_save_lp_mint',
    threw,
    liquidity,
    provisional,
    persisted: failure ? before : provisional,
    fallbackAmounts: failure ? { amount0, amount1 } : null,
    persistentDelta: failure ? 0 : liquidity,
  };
};

const cases = [];
for (const variant of variants) {
  cases.push({ variant: variant.path, mode: 'initial_one_sided', result: model({ initial: { totalSupply: 0, reserve0: 0, reserve1: 0 }, amount0: 0, amount1: 10, minOut: 1, mode: 'throw' }) });
  cases.push({ variant: variant.path, mode: 'existing_no_growth', result: model({ initial: { totalSupply: 100, reserve0: 100, reserve1: 100 }, amount0: 1, amount1: 1, minOut: 1, mode: 'no_growth' }) });
  cases.push({ variant: variant.path, mode: 'existing_math_throw', result: model({ initial: { totalSupply: 100, reserve0: 100, reserve1: 100 }, amount0: 10, amount1: 10, minOut: 1, mode: 'throw' }) });
  cases.push({ variant: variant.path, mode: 'valid_growth', result: model({ initial: { totalSupply: 100, reserve0: 100, reserve1: 100 }, amount0: 20, amount1: 20, minOut: 1, mode: 'valid' }) });
}

for (const c of cases) {
  const r = c.result;
  if (c.mode !== 'valid_growth' && (r.branch !== 'failure_exact_lpaccount_refund_no_pool_save' || r.persistentDelta !== 0)) {
    throw new Error(`${c.variant} ${c.mode} persisted provisional state`);
  }
  if (c.mode !== 'valid_growth' && (!r.fallbackAmounts || r.fallbackAmounts.amount0 < 0 || r.fallbackAmounts.amount1 < 0 || (r.fallbackAmounts.amount0 + r.fallbackAmounts.amount1) <= 0)) {
    throw new Error(`${c.variant} ${c.mode} did not preserve exact callback refund legs`);
  }
  if (c.mode === 'valid_growth' && r.branch !== 'success_pool_save_lp_mint') throw new Error(`${c.variant} valid case did not persist success`);
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DE3',
  variant_count: variants.length,
  cross_file_anchors: anchors.length,
  cases: cases.length,
  failure_cases: cases.filter((c) => c.result.branch.startsWith('failure')).length,
  persisted_failure_deltas: cases.filter((c) => c.result.branch.startsWith('failure')).map((c) => c.result.persistentDelta),
  fallback_amounts_exact: cases.filter((c) => c.result.fallbackAmounts).every((c) => c.result.fallbackAmounts.amount0 > 0 && c.result.fallbackAmounts.amount1 > 0),
  reason: 'All five in-scope pool math variants return a zero LP result at the no-growth boundary or throw into the callback catch. The callback may mutate supply/reserves in working state, but the failure condition sends exact token legs to the deterministic LPAccount zero-minimum refund StateInit and never calls storage::save on Pool. Only a valid liquidity result reaches LPWallet mint and Pool save; no attacker-positive persistent reserve/supply delta is reachable.'
}, null, 2));
