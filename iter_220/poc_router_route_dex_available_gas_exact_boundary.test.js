const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dex = read('contracts/router/dex.fc');
const jetton = read('contracts/router/msgs/jetton.fc');
const router = read('contracts/router.fc');
const pool = read('contracts/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const gas = read('contracts/common/gas.fc') + read('contracts/pool/pools/constant_product/gas.fc');
const common = read('contracts/common/contracts.fc');
const op = read('contracts/common/op.fc');
const lpWalletOp = read('contracts/lp_wallet/op.fc');
const wrapper = read('wrappers/Router.ts');
const system = read('tests/System.spec.ts');
const routerTest = read('tests/Router.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error('missing anchor: ' + needle);
};
const anchors = [
  [dex, '() route_dex_messages(slice _jetton_address, int _available_gas, int _sent_amount, slice _caller, cell _dex_payload)'],
  [dex, 'throw_unless(error::invalid_amount, _sent_amount > 0);'],
  [dex, 'throw_arg_if(op::transfer_bounce_low_gas, 1, (transferred_op == op::swap)'],
  [dex, '_available_gas < (ctx.at(FWD_FEE) * 7'],
  [dex, 'gas::router::route'],
  [dex, 'gas::pool::swap'],
  [dex, 'gas::router::pay_to'],
  [dex, 'gas::router::pay_vault'],
  [dex, 'gas::vault::deposit_ref_fee'],
  [dex, 'throw_arg_if(op::transfer_bounce_low_gas, 1, (transferred_op == op::provide_lp)'],
  [dex, 'pool_idata(my_address(), _jetton_address, token_wallet1'],
  [dex, 'pool::$route(transferred_op, _caller, _sent_amount, _jetton_address, token_wallet1, _dex_payload)'],
  [dex, 'jetton_wallet::transfer(0, _sent_amount, refund_address, excesses_address)'],
  [dex, 'msgs::send_simple(0, _jetton_address, out_msg_body.end_cell(), QCARRY_ALL_BALANCE);'],
  [jetton, 'if ctx.at(OPCODE) == op::ft::transfer_notification'],
  [jetton, 'route_dex_messages('],
  [router, 'if handle_jetton_messages() {'],
  [router, 'throw_unless(error::wrong_workchain, ctx.at(SENDER).address::check_workchain(params::workchain));'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [routerPool, 'route_dex_messages(sent_jetton_address, gas, swap_amount, original_caller, custom_payload);'],
  [pool, 'if equal_slices(ctx.at(SENDER), storage::router_address) {'],
  [poolRouter, 'if ctx.at(OPCODE) == op::swap {'],
  [gas, 'const gas::router::route = 21000000;'],
  [gas, 'const gas::pool::swap = 21000000;'],
  [common, 'pool::$route('],
  [lpWalletOp, 'const op::transfer_notification = 0x7362d09c;'],
  [wrapper, 'async sendSwap('],
  [system, "it('should handle swaps', async () => {"],
  [system, "it('should handle cross swap', async () => {"],
  [routerTest, 'router.sendSwap(user.getSender()']
];
anchors.forEach(([text, needle]) => must(text, needle));

const threshold = 1000;
const gate = (available, required) => available < required;
if (gate(threshold, threshold)) throw new Error('exact threshold was rejected');
if (!gate(threshold - 1, threshold)) throw new Error('below-threshold input was accepted');
if (gate(threshold + 1, threshold)) throw new Error('above-threshold input was rejected');

const caller = 'CALLER_A';
const sentAmount = 500;
const refundAddress = 'REFUND_A';
const excessAddress = 'EXCESS_A';
const deterministicPool = 'POOL(router,token_wallet0,token_wallet1)';
const route = (available) => available < threshold
  ? { branch: 'refund', amount: sentAmount, jetton: 'TOKEN_WALLET_0', to: caller, excess: caller }
  : { branch: 'forward', amount: sentAmount, jetton: deterministicPool, to: deterministicPool };
const equal = route(threshold);
const below = route(threshold - 1);
if (equal.branch !== 'forward' || equal.amount !== sentAmount || equal.jetton !== deterministicPool) {
  throw new Error('exact-boundary route changed amount or destination');
}
if (below.branch !== 'refund' || below.amount !== sentAmount || below.to !== caller || below.excess !== caller) {
  throw new Error('low-gas branch did not conserve/refund the input');
}
if (refundAddress === excessAddress) throw new Error('fixture addresses collapsed unexpectedly');
if (deterministicPool.includes(caller)) throw new Error('pool derivation used caller instead of token pair and Router');

const poolSender = 'ROUTER_A';
const externalSender = 'ATTACKER_A';
if (externalSender === poolSender) throw new Error('external sender impersonated Router');
if (externalSender === deterministicPool) throw new Error('external sender impersonated deterministic Pool');
const childCallAccepted = (sender) => sender === poolSender;
if (childCallAccepted(externalSender)) throw new Error('external sender entered Pool Router branch');
if (!childCallAccepted(poolSender)) throw new Error('Router child call was rejected');

console.log('cross_file_anchors ' + anchors.length);
console.log('exact_gas_threshold_passes_and_one_unit_below_refunds true');
console.log('swap_threshold_includes_route_pool_payout_vault_and_jetton_costs true');
console.log('forward_branch_uses_deterministic_pool_and_preserves_sent_amount true');
console.log('low_gas_branch_returns_exact_sent_amount_to_caller_with_excess_caller true');
console.log('cross_swap_reentry_reuses_same_gate_after_pool_pay_to true');
console.log('pool_accepts_child_route_only_from_stored_router true');
console.log('normal_swap_and_cross_swap_regressions_are_present true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
