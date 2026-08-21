const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];
const api = {
  get_swap_out: { result: '(int, int, int)', args: 'int _side, int _ref_value, int _amount_in, int _reserve_in, int _reserve_out' },
  get_lp_provide_init_out: { result: '(int)', args: 'int _left_amount, int _right_amount' },
  get_lp_provide_out: { result: '(int, int, int)', args: 'int _left_amount, int _right_amount' },
  get_lp_burn_out: { result: '(int, int)', args: 'int _lp_amount' },
};

const signatures = {};
for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  signatures[variant] = {};
  for (const [name, expected] of Object.entries(api)) {
    const marker = `${expected.result} pool::${name}(`;
    const start = source.indexOf(marker);
    assert(start >= 0, `${variant}: missing ${name}`);
    const argsStart = start + marker.length;
    const argsEnd = source.indexOf(')', argsStart);
    const args = source.slice(argsStart, argsEnd).replace(/\s+/g, ' ').trim();
    assert.equal(args, expected.args, `${variant}: ${name} argument ordering changed`);
    signatures[variant][name] = `${expected.result} ${args}`;
  }
  const body = source.slice(source.indexOf(`pool::${'get_swap_out'}`));
  assert(body.includes('protocol_fee_out'));
  assert(body.includes('ref_fee_out'));
  assert(body.includes('return (base_out, protocol_fee_out, ref_fee_out)'));
}
for (const name of Object.keys(api)) {
  const canonical = signatures[variants[0]][name];
  for (const variant of variants.slice(1)) assert.equal(signatures[variant][name], canonical, `${name}: cross-variant API mismatch`);
}

const poolTemplate = read('contracts/pool/pool.fc');
assert(poolTemplate.includes('#include "pools/<%= dexType %>/<%= dexType %>.fc"'));
const routerMessages = read('contracts/pool/msgs/router.fc');
const lpAccountMessages = read('contracts/pool/msgs/lp_account.fc');
const lpWalletMessages = read('contracts/pool/msgs/lp_wallet.fc');
assert(routerMessages.includes('pool::get_swap_out(true, ref_value, amount0, storage::reserve0, storage::reserve1)'));
assert(routerMessages.includes('pool::get_swap_out(false, ref_value, amount1, storage::reserve1, storage::reserve0)'));
assert(lpAccountMessages.includes('pool::get_lp_provide_init_out(tot_am0, tot_am1)'));
assert(lpAccountMessages.includes('pool::get_lp_provide_out(tot_am0, tot_am1)'));
assert(lpWalletMessages.includes('pool::get_lp_burn_out(jetton_amount)'));

const swapSides = [
  'pool::get_swap_out(true, ref_value, amount0, storage::reserve0, storage::reserve1)',
  'pool::get_swap_out(false, ref_value, amount1, storage::reserve1, storage::reserve0)',
];
const callerChecks = swapSides.filter((call) => routerMessages.includes(call)).length;
assert.equal(callerChecks, 2);

console.log(JSON.stringify({
  variants_checked: variants.length,
  api_functions_checked: Object.keys(api).length,
  signature_comparisons: variants.length * Object.keys(api).length,
  router_side_calls_checked: callerChecks,
  lp_provide_calls_checked: 2,
  lp_burn_calls_checked: 1,
  variant_argument_order_mismatches: 0,
  result: 'PASS',
}, null, 2));
