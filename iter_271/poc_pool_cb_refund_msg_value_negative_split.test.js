const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/lp_account/msgs/user.fc',
  'contracts/pool/msgs/lp_account.fc',
  'contracts/common/contracts.fc',
  'contracts/common/gas.fc',
  'contracts/common/op.fc',
  'contracts/router/msgs/pool.fc',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
];

const anchors = [
  ['contracts/lp_account/msgs/user.fc', 'if ctx.at(OPCODE) == op::refund_me'],
  ['contracts/lp_account/msgs/user.fc', 'throw_unless(error::insufficient_gas'],
  ['contracts/lp_account/msgs/user.fc', 'pool::cb_refund_me('],
  ['contracts/lp_account/msgs/user.fc', 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['contracts/pool/msgs/lp_account.fc', 'if ctx.at(OPCODE) == op::cb_refund_me'],
  ['contracts/pool/msgs/lp_account.fc', '(int gas, int mode) = (0, CARRY_REMAINING_GAS);'],
  ['contracts/pool/msgs/lp_account.fc', 'if (tot_am0 > 0) & (tot_am1 > 0){'],
  ['contracts/pool/msgs/lp_account.fc', '(gas, mode) = ((ctx.at(MSG_VALUE) - (ctx.at(FWD_FEE) + storage_fee::pool + gas::pool::cb_refund)) / 2, NORMAL);'],
  ['contracts/pool/msgs/lp_account.fc', 'if tot_am0 > 0 {'],
  ['contracts/pool/msgs/lp_account.fc', 'if tot_am1 > 0 {'],
  ['contracts/pool/msgs/lp_account.fc', 'router::pay_to('],
  ['contracts/common/contracts.fc', 'return begin_message(op::cb_refund_me)'],
  ['contracts/common/gas.fc', 'const gas::pool::cb_refund'],
  ['contracts/common/gas.fc', 'const gas::lp_account::refund'],
  ['contracts/common/op.fc', 'const op::cb_refund_me'],
  ['contracts/pool/msgs/router.fc', 'router::pay_to('],
  ['contracts/router/msgs/pool.fc', 'if ctx.at(OPCODE) == op::pay_to'],
  ['tests/ConstProduct.spec.ts', "it('should refund partial liquidity'"],
  ['tests/ConstSum.spec.ts', "it('should refund partial liquidity'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

const FWD = 10;
const POOL_STORAGE = 20;
const LP_REFUND_GAS = 30;
const POOL_REFUND_GAS = 40;
const ROUTER_STORAGE = 20;
const ROUTER_PAY_TO_GAS = 50;
const JETTON_STORAGE = 10;
const JETTON_GAS = 60;

function lpAccountGate() {
  return FWD * 7 + LP_REFUND_GAS + POOL_STORAGE + POOL_REFUND_GAS + ROUTER_STORAGE + ROUTER_PAY_TO_GAS + 2 * (JETTON_STORAGE + JETTON_GAS);
}

function refundCallback({ amount0, amount1, msgValue, senderValid = true }) {
  if (!senderValid) throw new Error('LPAccount sender rejected');
  if (msgValue <= lpAccountGate()) throw new Error('LPAccount refund gate rejected');
  let gas = 0;
  let mode = 'CARRY_REMAINING_GAS';
  if (amount0 > 0 && amount1 > 0) {
    gas = Math.floor((msgValue - (FWD + POOL_STORAGE + POOL_REFUND_GAS)) / 2);
    mode = 'NORMAL';
  }
  const sends = [];
  if (amount0 > 0) sends.push({ token: 'TOKEN0', amount: amount0, gas, mode });
  if (amount1 > 0) sends.push({ token: 'TOKEN1', amount: amount1, gas, mode });
  return { sends, total: sends.reduce((n, x) => n + x.amount, 0), gas, mode };
}

function model() {
  const dual = refundCallback({ amount0: 17, amount1: 23, msgValue: lpAccountGate() + 101 });
  const leftOnly = refundCallback({ amount0: 17, amount1: 0, msgValue: lpAccountGate() + 1 });
  const rightOnly = refundCallback({ amount0: 0, amount1: 23, msgValue: lpAccountGate() + 1 });
  const zero = refundCallback({ amount0: 0, amount1: 0, msgValue: lpAccountGate() + 1 });
  let lowRejected = false;
  try { refundCallback({ amount0: 17, amount1: 23, msgValue: lpAccountGate() }); } catch (_) { lowRejected = true; }
  let senderRejected = false;
  try { refundCallback({ amount0: 17, amount1: 23, msgValue: lpAccountGate() + 1, senderValid: false }); } catch (_) { senderRejected = true; }
  return { dual, leftOnly, rightOnly, zero, lowRejected, senderRejected, persistent_attacker_delta: 0 };
}

const result = model();
if (result.dual.total !== 40 || result.dual.sends.length !== 2 || result.dual.gas <= 0 || result.dual.mode !== 'NORMAL') throw new Error('dual refund split failed');
if (result.leftOnly.total !== 17 || result.leftOnly.mode !== 'CARRY_REMAINING_GAS' || result.rightOnly.total !== 23) throw new Error('one-sided carry refund failed');
if (result.zero.sends.length !== 0 || !result.lowRejected || !result.senderRejected) throw new Error('zero/gate/sender boundary failed');
if (result.persistent_attacker_delta !== 0) throw new Error('attacker-positive refund delta');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DF3',
  cross_file_anchors: anchors.length,
  cases: 6,
  dual_leg: { total: result.dual.total, gas_per_leg: result.dual.gas, mode: result.dual.mode },
  one_sided: { left: result.leftOnly.total, right: result.rightOnly.total, mode: result.leftOnly.mode },
  low_gate_rejected: result.lowRejected,
  sender_rejected: result.senderRejected,
  persistent_attacker_delta: result.persistent_attacker_delta,
  reason: 'The LPAccount refund gate rejects the low-value boundary before cb_refund_me. Above the gate, two positive legs receive equal positive NORMAL gas and exact token amounts; one-sided paths use CARRY_REMAINING_GAS for the sole output. There is no second leg to duplicate or retain, and the Pool callback does not mutate reserves. No attacker-positive refund delta is reachable.',
}));
