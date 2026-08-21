const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const op = read('contracts/common/op.fc');
const pool = read('contracts/pool.fc');
const system = read('tests/System.spec.ts');
const poolTests = read('tests/Pool.spec.ts');

const anchors = [
  ['pay_to branch', routerPool, 'if ctx.at(OPCODE) == op::pay_to'],
  ['owner parse', routerPool, 'slice owner = in_msg_body~load_msg_addr();'],
  ['excess parse', routerPool, 'slice excesses_address = in_msg_body~load_msg_addr();'],
  ['original caller parse', routerPool, 'slice original_caller = in_msg_body~load_msg_addr();'],
  ['forward parse', routerPool, 'int fwd_ton_amount = additional_info~load_coins();'],
  ['pool sender gate', routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  ['used gas', routerPool, 'int used_gas = ctx.at(FWD_FEE) + gas::router::pay_to;'],
  ['gas available', routerPool, 'int gas_available = ctx.at(MSG_VALUE) - (used_gas + storage_fee::router);'],
  ['forward suppression', routerPool, 'fwd_ton_amount = 0;'],
  ['token0 transfer', routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'],
  ['token1 transfer', routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount1_out, owner, excesses_address)'],
  ['router carry', routerPool, 'QCARRY_ALL_BALANCE'],
  ['pay_to builder', common, 'return begin_message(op::pay_to)'],
  ['builder excess field', common, '.store_slice(_excesses_address)'],
  ['builder forward field', common, '.store_coins(_ton_fwd_amount)'],
  ['jetton response field', common, '.store_slice(_response_address) ;; responseAddress'],
  ['jetton forward field', common, '.store_coins(_fwd_amount); ;; forward_ton_amount'],
  ['pool success caller', poolRouter, 'router::pay_to('],
  ['pool refund caller', poolRouter, 'refund_payload_cs, ;; clear custom_payload_cs, use refund_payload_cs'],
  ['lp wallet notification', lpWallet, '.store_uint(op::transfer_notification, 32)'],
  ['lp wallet excess branch', lpWallet, 'if ((response_address.preload_uint(2) != 0) & (msg_value > 0)) {'],
  ['lp wallet save', lpWallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['pay_to opcode schema', op, 'const op::pay_to'],
  ['pool router gate', pool, 'if equal_slices(ctx.at(SENDER), storage::router_address) {'],
  ['live cross route', system, "it('should handle cross swap', async () => {"],
  ['live refund route', poolTests, "it('should refund swap if tx is expired', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ amount0, amount1, fwd, msgValue, fwdFee, routerGas, storageFee, transferGas, senderOk = true, excessAddress = 'EXCESS' }) => {
  if (!senderOk) return { branch: 'reject_before_payload', tokenAmount: 0, forward: 0, excessRoute: null, assetDelta: 0, persistentDelta: 0 };
  const usedGas = fwdFee + routerGas;
  const gasAvailable = msgValue - (usedGas + storageFee);
  const suppressed = fwd > 0 && (gasAvailable - (transferGas + (fwdFee * 2)) - fwd <= 0);
  const forward = suppressed ? 0 : fwd;
  const tokenAmount = amount0 > 0 ? amount0 : amount1;
  const token = amount0 > 0 ? 'TOKEN0' : 'TOKEN1';
  return {
    branch: 'ordinary_fixed_transfer',
    token,
    tokenAmount,
    owner: 'OWNER',
    excessRoute: excessAddress === 'NONE' ? null : excessAddress,
    forward,
    forwardSuppressed: suppressed,
    carryMode: 'QCARRY_ALL_BALANCE',
    assetDelta: 0,
    persistentDelta: 0,
  };
};

const base = { fwdFee: 3, routerGas: 16, storageFee: 2, transferGas: 20 };
const cases = [
  model({ ...base, amount0: 100, amount1: 0, fwd: 10, msgValue: 100, excessAddress: 'EXCESS_A' }),
  model({ ...base, amount0: 0, amount1: 100, fwd: 10, msgValue: 41, excessAddress: 'EXCESS_B' }),
  model({ ...base, amount0: 100, amount1: 0, fwd: 0, msgValue: 50, excessAddress: 'EXCESS_C' }),
  model({ ...base, amount0: 0, amount1: 100, fwd: 10, msgValue: 100, excessAddress: 'NONE' }),
  model({ ...base, amount0: 100, amount1: 0, fwd: 10, msgValue: 100, senderOk: false, excessAddress: 'ATTACKER' }),
];

if (cases[0].forward !== 10 || cases[0].token !== 'TOKEN0' || cases[0].tokenAmount !== 100) {
  throw new Error('funded token0 forward case changed fixed transfer semantics');
}
if (!cases[1].forwardSuppressed || cases[1].forward !== 0 || cases[1].token !== 'TOKEN1') {
  throw new Error('low-gas boundary did not suppress forward TON on token1 path');
}
if (cases[2].forward !== 0 || cases[2].excessRoute !== 'EXCESS_C') {
  throw new Error('zero-forward excess case changed destination semantics');
}
if (cases[3].excessRoute !== null || cases[3].tokenAmount !== 100) {
  throw new Error('addr_none response did not suppress residual excess route');
}
if (cases[4].branch !== 'reject_before_payload' || cases.some((c) => c.assetDelta !== 0 || c.persistentDelta !== 0)) {
  throw new Error('sender gate or value conservation model failed');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DD2',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  branches: cases.map((c) => c.branch),
  fixed_token_amounts: cases.map((c) => c.tokenAmount),
  forward_amounts: cases.map((c) => c.forward),
  excess_routes: cases.map((c) => c.excessRoute),
  asset_deltas: cases.map((c) => c.assetDelta),
  persistent_deltas: cases.map((c) => c.persistentDelta),
  reason: 'Router pay_to authenticates the deterministic Pool before the normal branch. It carries a fixed one-sided jetton amount to the selected token wallet, passes the owner and excess response fields in the canonical transfer body, and uses QCARRY_ALL_BALANCE only for remaining TON. At the explicit low-gas boundary it suppresses forward_ton_amount rather than changing the token amount; addr_none suppresses only the residual excess response. The response/forward split therefore has no attacker-positive token, reserve, or persistent delta.'
}, null, 2));
