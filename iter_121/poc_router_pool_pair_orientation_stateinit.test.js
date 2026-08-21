const assert = require('node:assert/strict');
const fs = require('node:fs');

function canonicalPair(first, second) {
  return first > second ? [first, second] : [second, first];
}

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/pools';
const contracts = [
  'constant_product',
  'constant_sum',
  'stableswap',
  'weighted_const_product',
  'weighted_stableswap',
].map((poolType) => fs.readFileSync(`${sourceRoot}/${poolType}/state_init.fc`, 'utf8'));
const routerGetter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/get.fc',
  'utf8',
);
const routerPool = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/pool.fc',
  'utf8',
);

assert.deepEqual(canonicalPair('wallet-A', 'wallet-Z'), canonicalPair('wallet-Z', 'wallet-A'));
for (const poolType of contracts) {
  assert.match(poolType, /if _first_jetton_address\.slice_hash\(\) > _second_jetton_address\.slice_hash\(\)/);
  assert.match(poolType, /\.store_slice\(_first_jetton_address\).*\.store_slice\(_second_jetton_address\)/s);
  assert.match(poolType, /\.store_slice\(_second_jetton_address\).*\.store_slice\(_first_jetton_address\)/s);
}
assert.match(routerGetter, /pool_idata\(my_address\(\), token0, token1/);
assert.match(routerPool, /pool_idata\(\s*my_address\(\),\s*token0_address,\s*token1_address/s);

console.log('AC1 canonical pair/state-init check passed');
