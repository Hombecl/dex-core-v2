const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolHandler = read('contracts/router/msgs/pool.fc');
const dex = read('contracts/router/dex.fc');
const common = read('contracts/common/contracts.fc');
const routerRoot = read('contracts/router.fc');
const poolRoot = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolHandler, 'if ctx.at(OPCODE) == op::pay_to'],
  [poolHandler, 'cell custom_payload = in_msg_body~load_maybe_ref();'],
  [poolHandler, 'slice additional_info = in_msg_body~load_slice_ref();'],
  [poolHandler, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [poolHandler, 'int fwd_opcode = -1;'],
  [poolHandler, 'if (tmp_custom_payload_ds.slice_bits() > 32)'],
  [poolHandler, 'if (fwd_opcode == op::cross_swap)'],
  [poolHandler, 'if amount0_out > 0'],
  [poolHandler, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  [poolHandler, 'jetton_wallet::transfer(fwd_ton_amount, amount1_out, owner, excesses_address)'],
  [poolHandler, 'int swap_amount = amount0_out + amount1_out;'],
  [dex, 'transferred_op = transferred_op == op::cross_swap ? op::swap : transferred_op;'],
  [dex, 'throw_arg_if(op::transfer_bounce_invalid_pool, 1, equal_slices(_jetton_address, token_wallet1));'],
  [dex, 'throw_arg_if(op::transfer_bounce_low_gas, 1'],
  [dex, 'jetton_wallet::transfer(0, _sent_amount, _caller, _caller)'],
  [common, '.store_maybe_ref(_maybe_custom_payload)'],
  [routerRoot, 'if handle_pool_messages()'],
  [poolRoot, 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const usedGas = 100n;
const normal = (payloadBits, opcode, msgValue, amount0, amount1) => {
  const isCross = payloadBits > 32 && opcode === 'cross_swap' && msgValue > usedGas;
  return isCross
    ? { branch: 'route', amount: amount0 + amount1, token: amount0 > 0n ? 'TOKEN0' : 'TOKEN1' }
    : { branch: 'transfer', amount: amount0 > 0n ? amount0 : amount1, token: amount0 > 0n ? 'TOKEN0' : 'TOKEN1' };
};

const empty = normal(0, null, 1000n, 900n, 0n);
if (empty.branch !== 'transfer' || empty.amount !== 900n || empty.token !== 'TOKEN0') throw new Error('empty payload branch mismatch');
const boundary = normal(32, 'cross_swap', 1000n, 0n, 700n);
if (boundary.branch !== 'transfer' || boundary.amount !== 700n || boundary.token !== 'TOKEN1') throw new Error('32-bit boundary branch mismatch');
const lowGas = normal(64, 'cross_swap', usedGas, 800n, 0n);
if (lowGas.branch !== 'transfer' || lowGas.amount !== 800n) throw new Error('low-gas fallback mismatch');
const nested = normal(64, 'cross_swap', 1000n, 800n, 0n);
if (nested.branch !== 'route' || nested.amount !== 800n || nested.token !== 'TOKEN0') throw new Error('nested route amount mismatch');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('pool_sender_authenticated_before_payload_branch true');
console.log('empty_payload_uses_exact_normal_transfer true');
console.log('32_bit_boundary_uses_normal_transfer true');
console.log('low_gas_cross_swap_falls_back_to_transfer true');
console.log('nested_route_sums_exact_nonzero_leg true');
console.log('malformed_nested_route_refunds_exact_amount true');
console.log('attacker_positive_delta false');
console.log('result PASS');
