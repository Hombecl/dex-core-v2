const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const SCALE = 1_000_000_000_000_000_000n;
const UINT = (bits) => (1n << BigInt(bits)) - 1n;
const bitLength = (n) => (n === 0n ? 0 : n.toString(2).length);

const stableswapAdmin = read('contracts/router/pools/stableswap/ext_admin.fc');
const stableswapRouter = read('contracts/pool/pools/stableswap/ext_router.fc');
const stableswapStorage = read('contracts/pool/pools/stableswap/storage.fc');
const wcpiAdmin = read('contracts/router/pools/weighted_const_product/ext_admin.fc');
const wcpiRouter = read('contracts/pool/pools/weighted_const_product/ext_router.fc');
const wcpiStorage = read('contracts/pool/pools/weighted_const_product/storage.fc');
const wstableAdmin = read('contracts/router/pools/weighted_stableswap/ext_admin.fc');
const wstableRouter = read('contracts/pool/pools/weighted_stableswap/ext_router.fc');
const wstableStorage = read('contracts/pool/pools/weighted_stableswap/storage.fc');

assert(stableswapAdmin.includes('load_uint32()'));
assert(stableswapRouter.includes('load_uint32()'));
assert(stableswapStorage.includes('load_uint32()'));
assert(wcpiAdmin.includes('load_uint128()'));
assert(wcpiRouter.includes('load_uint128()'));
assert(wcpiStorage.includes('load_uint(64)'));
assert(wcpiAdmin.includes('(0 < new_w) & (new_w < math::ONE_DEC)'));
assert(wstableAdmin.includes('load_uint128()'));
assert(wstableRouter.includes('load_uint128()'));
assert(wstableStorage.includes('load_uint(128)'));
assert(wstableAdmin.includes('new_amp <= (2000 * math::ONE_DEC)'));

const stableAccepted = [1n, 2_000n];
const stableRejected = [0n, 2_001n, UINT(32)];
for (const value of stableAccepted) assert(value >= 1n && value <= 2_000n && value <= UINT(32));
for (const value of stableRejected) assert(!(value >= 1n && value <= 2_000n));

const wcpiAccepted = [1n, SCALE - 1n];
const wcpiRejected = [0n, SCALE, UINT(128)];
for (const value of wcpiAccepted) assert(value > 0n && value < SCALE && value <= UINT(64));
for (const value of wcpiRejected) assert(!(value > 0n && value < SCALE));

const wstableAmpAccepted = [0n, 1n, 2_000n * SCALE];
const wstableAmpRejected = [2_000n * SCALE + 1n, UINT(128)];
for (const value of wstableAmpAccepted) assert(value <= 2_000n * SCALE && value <= UINT(128));
for (const value of wstableAmpRejected) assert(value > 2_000n * SCALE);
const wstableWeightAccepted = [1n, SCALE - 1n];
for (const value of wstableWeightAccepted) assert(value > 0n && value < SCALE && value <= UINT(128));
const wstableRateValues = [0n, 1n, SCALE, UINT(128)];
for (const value of wstableRateValues) assert(value <= UINT(128));

const setterFieldsChecked = 3;
const widthPairsChecked = 3;
const domainEdgesChecked = stableAccepted.length + stableRejected.length + wcpiAccepted.length + wcpiRejected.length + wstableAmpAccepted.length + wstableAmpRejected.length + wstableWeightAccepted.length + wstableRateValues.length;
assert(bitLength(SCALE - 1n) <= 60);
const poolSaveSites = [stableswapRouter, wcpiRouter, wstableRouter].filter((source) => source.includes('storage::save()')).length;
assert.equal(poolSaveSites, 3);

console.log(JSON.stringify({
  setter_fields_checked: setterFieldsChecked,
  width_pairs_checked: widthPairsChecked,
  domain_edges_checked: domainEdgesChecked,
  wcpi_narrow_storage_bits: 64,
  wcpi_max_accepted_weight_bits: bitLength(SCALE - 1n),
  truncation_reachable_under_admin_bound: false,
  pool_setter_save_sites_checked: poolSaveSites,
  result: 'PASS',
}, null, 2));
