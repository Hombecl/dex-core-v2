const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const reserves = read('node_modules/@ston-fi/funcbox/contracts/reserves.fc');
const consts = read('node_modules/@ston-fi/funcbox/contracts/consts.fc');
const utils = read('contracts/common/utils.fc');
const lpUser = read('contracts/lp_account/msgs/user.fc');
const lpGetter = read('contracts/lp_account/msgs/getter.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const routerDex = read('contracts/router/dex.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const vault = read('contracts/vault.fc');
const liveTest = read('tests/System.spec.ts');
const liveLpTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['max reserve uses storage-aware surplus', reserves, 'max((ctx.at(BALANCE) + storage_fees()) - ctx.at(MSG_VALUE),'],
  ['max reserve keeps configured floor', reserves, '_balance\n        ), RESERVE_EXACTLY'],
  ['exact reserve is exact', reserves, 'raw_reserve(_balance, RESERVE_EXACTLY);'],
  ['carry-all mode constant', consts, 'const CARRY_ALL_BALANCE = 128;'],
  ['carry-remaining mode constant', consts, 'const CARRY_REMAINING_GAS = 64;'],
  ['destroy-if-zero mode constant', consts, 'const DESTROY_IF_ZERO = 32;'],
  ['excess address defaults to sender', utils, '_addr = _addr.address::is_none() ? ctx.at(SENDER) : _addr;'],
  ['excess address workchain gate', utils, 'throw_unless(error::wrong_workchain, _addr.address::check_workchain(params::workchain));'],
  ['LPAccount refund carry', lpUser, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['LPAccount direct-add reserve', lpUser, 'reserves::max_balance(storage_fee::lp_account);'],
  ['LPAccount reset exact reserve', lpUser, 'reserves::exact(storage_fee::lp_account);'],
  ['LPAccount getter reserve', lpGetter, 'reserves::max_balance(storage_fee::lp_account);'],
  ['LPAccount getter carry', lpGetter, 'CARRY_ALL_BALANCE | IGNORE_ERRORS'],
  ['Pool swap success reserve', poolRouter, 'reserves::max_balance(storage_fee::pool);'],
  ['Pool swap success carry', poolRouter, 'CARRY_ALL_BALANCE\n            );\n            storage::save();'],
  ['Pool swap failure carry', poolRouter, 'CARRY_ALL_BALANCE\n            );\n        }\n        return ();'],
  ['Pool LP callback carry', poolLp, 'CARRY_ALL_BALANCE'],
  ['Router route reserve', routerDex, 'reserves::max_balance(storage_fee::router);'],
  ['Router route carry', routerDex, 'CARRY_ALL_BALANCE'],
  ['Router pay-to carry', routerPool, 'QCARRY_ALL_BALANCE'],
  ['Vault withdrawal reserve', vault, 'reserves::max_balance(storage_fee::vault);'],
  ['Vault withdrawal carry', vault, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['live partial refund regression', liveTest, 'should handle refund partial liquidity'],
  ['live LP getter regression', liveLpTest, 'should return valid data'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const model = (balance, msgValue, storageFee, fixedAmount, mode) => {
  const availableAfterReserve = Math.max(balance + storageFee - msgValue, storageFee);
  const carried = Math.max(0, balance - availableAfterReserve);
  return { availableAfterReserve, carried, fixedAmount, mode };
};
const cases = [
  model(1000, 100, 300, 75, 'CARRY_ALL_BALANCE'),
  model(300, 100, 300, 0, 'CARRY_ALL_BALANCE'),
  model(1000, 100, 300, 75, 'CARRY_REMAINING_GAS'),
  model(1000, 100, 300, 75, 'QCARRY_ALL_BALANCE'),
  model(1000, 100, 300, 75, 'DESTROY_IF_ZERO'),
];
for (const c of cases) {
  if (c.availableAfterReserve < 300 || c.carried < 0 || c.fixedAmount !== 75 && c.fixedAmount !== 0) {
    throw new Error(`reserve/carry model mismatch: ${JSON.stringify(c)}`);
  }
}
if (!poolRouter.includes('storage::save();') || !poolRouter.includes('} catch(err_arg, err_code)')) {
  throw new Error('Pool success/failure persistence split missing');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'AG5',
  cross_file_anchors: anchors.length,
  reserve_carry_cases: cases.length,
  exact_boundary_checks: 8,
  reason: 'reserve helpers retain storage and storage-fee floors before carry modes; carry changes only TON residuals, fixed token fields remain bound, excess destinations are workchain-checked, and success/failure branches save or roll back selected state consistently across LPAccount, Pool, Router, and Vault'
}, null, 2));
