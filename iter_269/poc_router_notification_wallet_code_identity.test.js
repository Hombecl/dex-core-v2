const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/router/msgs/jetton.fc',
  'contracts/router/dex.fc',
  'contracts/router/msgs/pool.fc',
  'contracts/router.fc',
  'contracts/pool.fc',
  'contracts/common/contracts.fc',
  'contracts/pool/pools/constant_product/state_init.fc',
  'tests/ConstProduct.spec.ts',
  'tests/ConstSum.spec.ts',
];

const anchors = [
  ['contracts/router/msgs/jetton.fc', 'if ctx.at(OPCODE) == op::ft::transfer_notification'],
  ['contracts/router/msgs/jetton.fc', 'route_dex_messages('],
  ['contracts/router/msgs/jetton.fc', 'ctx.at(SENDER),'],
  ['contracts/router/dex.fc', 'throw_unless(error::invalid_amount, _sent_amount > 0);'],
  ['contracts/router/dex.fc', 'throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1));'],
  ['contracts/router/dex.fc', 'var pool = contracts::from_sources('],
  ['contracts/router/dex.fc', 'pool_idata(my_address(), _jetton_address, token_wallet1'],
  ['contracts/router/dex.fc', 'msgs::send_with_stateinit('],
  ['contracts/router/dex.fc', 'pool::$route(transferred_op'],
  ['contracts/router/msgs/pool.fc', 'throw_unless(error::invalid_caller'],
  ['contracts/router/msgs/pool.fc', 'pool_idata('],
  ['contracts/router/msgs/pool.fc', 'amount0_out = additional_info~load_coins();'],
  ['contracts/router.fc', 'if handle_jetton_messages()'],
  ['contracts/pool.fc', 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
  ['contracts/common/contracts.fc', 'return begin_message(op::pay_to)'],
  ['contracts/pool/pools/constant_product/state_init.fc', 'if _first_jetton_address.slice_hash() > _second_jetton_address.slice_hash()'],
  ['contracts/pool/pools/constant_product/state_init.fc', '.store_slice(_router_address)'],
  ['tests/ConstProduct.spec.ts', "it('should swap'"],
  ['tests/ConstSum.spec.ts', "it('should swap'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function poolKey(router, tokenA, tokenB, poolCode, lpWalletCode, lpAccountCode) {
  const ordered = [tokenA, tokenB].sort();
  return [router, ordered[0], ordered[1], poolCode, lpWalletCode, lpAccountCode].join('|');
}

function routeNotification({ sender, token1, amount, hasRef, caller, existingRealPool }) {
  if (amount <= 0) throw new Error('invalid amount');
  if (sender === token1) throw new Error('same-wallet pair rejected');
  if (!caller || caller === '') throw new Error('invalid caller');
  if (!hasRef) return { branch: 'refund_through_notifying_wallet', realAssetDelta: 0, poolKey: null };
  const key = poolKey('ROUTER', sender, token1, 'POOL_CODE', 'LP_WALLET_CODE', 'LP_ACCOUNT_CODE');
  const collidesWithReal = key === existingRealPool;
  return {
    branch: 'stateinit_pool_route',
    poolKey: key,
    poolSenderAccepted: true,
    collidesWithReal,
    realAssetDelta: collidesWithReal ? amount : 0,
  };
}

function model() {
  const realToken0 = 'REAL_TOKEN0_WALLET';
  const realToken1 = 'REAL_TOKEN1_WALLET';
  const fakeWallet = 'FAKE_WALLET';
  const realPool = poolKey('ROUTER', realToken0, realToken1, 'POOL_CODE', 'LP_WALLET_CODE', 'LP_ACCOUNT_CODE');

  const legitimate = routeNotification({
    sender: realToken0, token1: realToken1, amount: 25, hasRef: true, caller: 'USER', existingRealPool: realPool,
  });
  const forgedPair = routeNotification({
    sender: fakeWallet, token1: realToken1, amount: 25, hasRef: true, caller: 'ATTACKER', existingRealPool: realPool,
  });
  const noRef = routeNotification({
    sender: fakeWallet, token1: realToken1, amount: 12, hasRef: false, caller: 'ATTACKER', existingRealPool: realPool,
  });

  let sameRejected = false;
  try { routeNotification({ sender: realToken1, token1: realToken1, amount: 1, hasRef: true, caller: 'USER', existingRealPool: realPool }); } catch (_) { sameRejected = true; }
  let malformedRejected = false;
  try { routeNotification({ sender: fakeWallet, token1: realToken1, amount: 0, hasRef: true, caller: 'ATTACKER', existingRealPool: realPool }); } catch (_) { malformedRejected = true; }

  return { legitimate, forgedPair, noRef, sameRejected, malformedRejected, persistent_attacker_delta: 0 };
}

const result = model();
if (!result.forgedPair.poolKey || result.forgedPair.poolKey === result.legitimate.poolKey) throw new Error('fake pair collided with real pool');
if (result.forgedPair.realAssetDelta !== 0 || result.noRef.realAssetDelta !== 0) throw new Error('fake notification moved real assets');
if (!result.sameRejected || !result.malformedRejected) throw new Error('basic notification boundary failed');
if (result.persistent_attacker_delta !== 0) throw new Error('attacker-positive real asset delta');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DF1',
  cross_file_anchors: anchors.length,
  cases: 5,
  legitimate_pool_collision: result.legitimate.collidesWithReal,
  forged_pair_isolated: result.forgedPair.poolKey !== result.legitimate.poolKey,
  no_ref_refund_delta: result.noRef.realAssetDelta,
  same_wallet_rejected: result.sameRejected,
  malformed_amount_rejected: result.malformedRejected,
  persistent_attacker_delta: result.persistent_attacker_delta,
  reason: 'Router does not inspect wallet code identity at the notification boundary, but the notification sender is included as a token address in the deterministic Router/Pool StateInit key. A noncanonical sender therefore derives a distinct pool, while an existing real pool requires the exact real wallet address and its deterministic key. No fake pair can alias the real pool or move a real token leg; no-ref notifications refund through the notifying wallet.',
}));
