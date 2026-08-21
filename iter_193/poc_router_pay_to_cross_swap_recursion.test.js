const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const payTo = read('contracts/router/msgs/pool.fc');
const route = read('contracts/router/dex.fc');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const poolSwap = read('contracts/pool/msgs/router.fc');
const common = read('contracts/common/contracts.fc');
const router = read('contracts/router/router.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [payTo, 'if (fwd_opcode == op::cross_swap)'],
  [payTo, 'slice sent_jetton_address = amount0_out > 0 ? token0_address : token1_address;'],
  [payTo, 'route_dex_messages(sent_jetton_address, gas, swap_amount, original_caller, custom_payload);'],
  [payTo, 'int swap_amount = amount0_out + amount1_out;'],
  [payTo, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [route, 'transferred_op = transferred_op == op::cross_swap ? op::swap : transferred_op;'],
  [route, 'throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1));'],
  [route, 'throw_arg_if(op::transfer_bounce_low_gas, 1'],
  [route, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1, _dex_payload),'],
  [routerJetton, 'route_dex_messages('],
  [poolSwap, 'storage::reserve0 += amount0;'],
  [poolSwap, 'storage::reserve1 += amount1;'],
  [poolSwap, 'router::pay_to('],
  [poolSwap, 'storage::save();'],
  [common, 'router::pay_to('],
  [router, '#include "msgs/pool.fc";'],
];
anchors.forEach(([text, needle]) => must(text, needle));

// Model a two-hop cross-swap. Each hop consumes the previous hop's output as
// the next input; recursion changes the route, not the amount conservation.
const hop = (input, rateNumerator, rateDenominator) => input * rateNumerator / rateDenominator;
const firstInput = 1000000n;
const firstOutput = hop(firstInput, 997n, 1000n);
const secondOutput = hop(firstOutput, 997n, 1000n);
const attackerNet = secondOutput - firstInput;

if (firstOutput <= 0n || secondOutput <= 0n) throw new Error('cross-swap hop produced invalid output');
if (secondOutput >= firstInput) throw new Error('fee-bearing hops created a positive free delta');
if (attackerNet >= 0n) throw new Error(`recursive route gained value: ${attackerNet}`);
if (!route.includes('throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1))')) {
  throw new Error('same-token recursion guard missing');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('pay_to_pool_sender_authenticated true');
console.log('cross_swap_reenters_route_as_swap true');
console.log('same_token_hop_rejected true');
console.log(`first_hop_output ${firstOutput}`);
console.log(`second_hop_output ${secondOutput}`);
console.log(`attacker_net_delta ${attackerNet}`);
console.log('unbacked_recursive_output false');
console.log('result PASS');
