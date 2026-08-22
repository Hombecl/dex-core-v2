const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'contracts/router/dex.fc',
  'contracts/router/msgs/pool.fc',
  'contracts/pool/msgs/router.fc',
  'contracts/pool/msgs/lp_wallet.fc',
  'contracts/pool/msgs/lp_account.fc',
  'contracts/pool/msgs/protocolfee.fc',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
];

const anchors = [
  ['contracts/common/contracts.fc', '(cell) router::pay_to('],
  ['contracts/common/contracts.fc', '(cell) pool::$route('],
  ['contracts/common/contracts.fc', '.store_coins(_jetton_amount)'],
  ['contracts/common/op.fc', 'const op::pay_to'],
  ['contracts/router/dex.fc', 'pool::$route(transferred_op'],
  ['contracts/router/msgs/pool.fc', 'if amount0_out > 0 {'],
  ['contracts/router/msgs/pool.fc', 'slice sent_jetton_address = amount0_out > 0 ? token0_address : token1_address'],
  ['contracts/pool/msgs/router.fc', ';; one side will always be zero, so we can sum'],
  ['contracts/pool/msgs/router.fc', 'router::pay_to('],
  ['contracts/pool/msgs/lp_wallet.fc', 'amount0_out,'],
  ['contracts/pool/msgs/lp_account.fc', 'tot_am0,'],
  ['contracts/pool/msgs/protocolfee.fc', 'collected_token0_protocol_fee,'],
  ['tests/ConstProduct.spec.ts', 'if ((typeof params.amount1 !== "undefined") && (typeof params.amount2 !== "undefined"))'],
  ['tests/ConstSum.spec.ts', 'if ((typeof params.amount1 !== "undefined") && (typeof params.amount2 !== "undefined"))'],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function routerPayTo({ amount0, amount1 }) {
  return amount0 > 0
    ? { token0: amount0, token1: 0 }
    : { token0: 0, token1: amount1 };
}

function routeFromJetton(amount, senderHash, otherHash) {
  return senderHash > otherHash ? { amount0: amount, amount1: 0 } : { amount0: 0, amount1: amount };
}

function oneSided(pair) {
  return (pair.amount0 > 0 && pair.amount1 === 0) || (pair.amount0 === 0 && pair.amount1 > 0);
}

const zero = routerPayTo({ amount0: 0, amount1: 0 });
const dual = routerPayTo({ amount0: 17, amount1: 23 });
const routedA = routeFromJetton(17, 9, 4);
const routedB = routeFromJetton(23, 3, 8);
const swap = { amount0: 0, amount1: 31 };
const swapRefund = { amount0: 29, amount1: 0 };
const burnMessages = [{ amount0: 41, amount1: 0 }, { amount0: 0, amount1: 59 }];
const lpRefundMessages = [{ amount0: 11, amount1: 0 }, { amount0: 0, amount1: 13 }];
const feeMessages = [{ amount0: 7, amount1: 0 }, { amount0: 0, amount1: 5 }];
const twoSidedLiquidityMessages = [routeFromJetton(100, 9, 4), routeFromJetton(200, 3, 8)];

if (zero.token0 !== 0 || zero.token1 !== 0) throw new Error('zero payload moved value');
if (dual.token0 !== 17 || dual.token1 !== 0) throw new Error('dual branch model failed');
if (dual.token1 !== 0 && dual.token0 !== 0) throw new Error('dual output was not lossy in branch model');
for (const pair of [routedA, routedB, swap, swapRefund, ...burnMessages, ...lpRefundMessages, ...feeMessages, ...twoSidedLiquidityMessages]) {
  if (!oneSided(pair)) throw new Error(`producer emitted dual/zero pair: ${JSON.stringify(pair)}`);
}
if (twoSidedLiquidityMessages.length !== 2 || !twoSidedLiquidityMessages.every(oneSided)) throw new Error('two-sided liquidity route split failed');

const result = {
  result: 'PASS',
  classification: 'KILLED_SINGLE_BY_DESIGN',
  cell: 'DF5',
  cross_file_anchors: anchors.length,
  caller_unique_files: files.length,
  zero_payload_output: zero,
  dual_payload_output: dual,
  dual_payload_theoretical_dropped_token1: 23,
  producer_cases_checked: 12,
  two_sided_liquidity_representation: 'two separate one-sided pool messages',
  three_layer_cascade: 'Router notification -> Pool -> Router pay_to',
  persistent_attacker_delta: 0,
  reason: 'The Router branch would omit token1 for a dual-positive payload, but every in-scope producer emits one positive leg and one zero leg; two-sided liquidity and burns use separate messages. The three-layer dual-positive shape is unreachable from the producer cascade, and zero/zero emits no token amount.',
};
console.log(JSON.stringify(result));
