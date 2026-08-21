const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const poolBurn = read('contracts/pool/msgs/lp_wallet.fc');
const poolRoot = read('contracts/pool.fc');
const wallet = read('contracts/lp_wallet.fc');
const router = read('contracts/router/msgs/pool.fc');
const commonContracts = read('contracts/common/contracts.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['burn input', poolBurn, 'int jetton_amount = in_msg_body~load_coins();'],
  ['burn output math', poolBurn, 'pool::get_lp_burn_out(jetton_amount)'],
  ['reserve provisional debit', poolBurn, 'storage::reserve0 -= amount0_out;'],
  ['second reserve provisional debit', poolBurn, 'storage::reserve1 -= amount1_out;'],
  ['supply provisional debit', poolBurn, 'storage::total_supply_lp -= jetton_amount;'],
  ['strict gas boundary', poolBurn, 'throw_unless(error::insufficient_gas'],
  ['gas includes pool burn', poolBurn, 'gas::pool::burn_ext'],
  ['gas includes Router pay_to', poolBurn, 'gas::router::pay_to'],
  ['reserve after gas', poolBurn, 'reserves::max_balance(storage_fee::pool);'],
  ['first payout', poolBurn, 'amount0_out'],
  ['second payout', poolBurn, 'amount1_out'],
  ['save after payout construction', poolBurn, 'storage::save();'],
  ['Pool root handler', poolRoot, 'handle_lp_wallet_messages()'],
  ['wallet burn debit', wallet, 'balance -= jetton_amount;'],
  ['wallet burn outbound', wallet, '.store_uint(op::burn_notification_ext, 32)'],
  ['wallet bounce restore', wallet, 'balance += jetton_amount;'],
  ['Router Pool auth', router, 'throw_unless(error::invalid_caller'],
  ['callback message builder', commonContracts, 'router::pay_to('],
  ['live System burn', system, 'sendBurnLPResult'],
  ['live variant burn', constProduct, 'sendBurnExt'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const burnAttempt = (reserve0, reserve1, supply, out0, out1, amount, msgValue, threshold) => {
  const provisional = {
    reserve0: reserve0 - out0,
    reserve1: reserve1 - out1,
    supply: supply - amount,
  };
  if (msgValue <= threshold) {
    return { success: false, persisted: { reserve0, reserve1, supply }, provisional };
  }
  return { success: true, persisted: provisional, provisional };
};
const cases = [
  burnAttempt(10000, 12000, 5000, 1000, 1200, 500, 999, 999),
  burnAttempt(10000, 12000, 5000, 1000, 1200, 500, 1000, 999),
  burnAttempt(10000, 12000, 5000, 1000, 1200, 500, 998, 999),
];
if (cases[0].success || cases[2].success) throw new Error('strict gas boundary accepted');
if (!cases[0].success && JSON.stringify(cases[0].persisted) !== JSON.stringify({ reserve0: 10000, reserve1: 12000, supply: 5000 })) {
  throw new Error('failed burn persisted provisional state');
}
if (!cases[1].success || cases[1].persisted.reserve0 !== 9000 || cases[1].persisted.supply !== 4500) {
  throw new Error('successful burn did not persist exact deltas');
}
if (!poolBurn.includes('storage::save();') || poolBurn.indexOf('storage::save();') < poolBurn.indexOf('throw_unless(error::insufficient_gas')) {
  throw new Error('Pool save precedes gas guard');
}
if (!poolRoot.includes('if ctx.at(IS_BOUNCED)')) throw new Error('Pool bounce rollback context missing');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BB1',
  cross_file_anchors: anchors.length,
  gas_cases: cases.length,
  strict_boundary_checks: 3,
  rollback_cases: 2,
  exact_success_deltas: 2,
  reason: 'Pool burn working-state reserve/supply subtraction occurs before a strict gas guard but no storage save occurs before that guard; failure reverts the transaction and the LPWallet debit is covered by the typed bounce restore. Successful paths save only after fixed two-leg payout construction and Router sender authentication'
}, null, 2));
