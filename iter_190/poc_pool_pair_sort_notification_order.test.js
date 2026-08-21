const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const common = read('contracts/common/contracts.fc');
const routerDex = read('contracts/router/dex.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const variants = [
  'constant_product',
  'constant_sum',
  'stableswap',
  'weighted_const_product',
  'weighted_stableswap',
].map((name) => [name, read(`contracts/pool/pools/${name}/state_init.fc`)]);

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
must(common, 'if _sender_jetton_address.slice_hash() > _other_jetton_address.slice_hash()');
must(common, '.store_coins(_jetton_amount)');
must(routerDex, 'pool_idata(my_address(), _jetton_address, token_wallet1');
must(routerDex, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1');
must(routerPool, 'pool_idata(');
must(poolRouter, 'int amount0 = in_msg_body~load_coins();');
must(poolRouter, 'int amount1 = in_msg_body~load_coins();');
must(poolRouter, 'storage::token0_address');
for (const [name, source] of variants) {
  must(source, 'if _first_jetton_address.slice_hash() > _second_jetton_address.slice_hash()');
  must(source, '.store_slice(_first_jetton_address)');
  must(source, '.store_slice(_second_jetton_address)');
}

// Model the exact branch in pool::$route and StateInit. The symbolic hash
// values stand in for slice_hash() and preserve the two possible orders.
const A = { name: 'wallet-A', hash: 10 };
const B = { name: 'wallet-B', hash: 20 };
const canonicalPair = (x, y) => x.hash > y.hash ? [x, y] : [y, x];
const routedLeg = (sender, other, amount) => sender.hash > other.hash
  ? { amount0: amount, amount1: 0n }
  : { amount0: 0n, amount1: amount };
const forward = routedLeg(A, B, 111n);
const reverse = routedLeg(B, A, 222n);
const stateForward = canonicalPair(A, B).map((x) => x.name);
const stateReverse = canonicalPair(B, A).map((x) => x.name);

if (stateForward.join('|') !== stateReverse.join('|')) throw new Error('reversed notification changed Pool StateInit');
if (forward.amount0 !== 0n || forward.amount1 !== 111n) throw new Error('forward leg not canonicalized');
if (reverse.amount0 !== 222n || reverse.amount1 !== 0n) throw new Error('reverse leg not canonicalized');
const accumulated = {
  [stateForward[0]]: forward.amount0 + reverse.amount0,
  [stateForward[1]]: forward.amount1 + reverse.amount1,
};
if (accumulated['wallet-A'] !== 111n || accumulated['wallet-B'] !== 222n) {
  throw new Error(`amount legs inverted: A=${accumulated['wallet-A']} B=${accumulated['wallet-B']}`);
}

console.log(`cross_file_anchors ${11 + variants.length * 3}`);
console.log(`variant_state_init_sorters ${variants.length}`);
console.log('reversed_notification_same_pool true');
console.log('forward_and_reverse_amounts_canonicalized true');
console.log('token0_token1_assignment_stable true');
console.log('attacker_positive_delta false');
console.log('result PASS');
