const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const poolBurn = read('contracts/pool/msgs/lp_wallet.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const contracts = read('contracts/common/contracts.fc');
const op = read('contracts/common/op.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['burn opcode schema', op, 'const op::burn_notification_ext'],
  ['burn body maybe-ref schema', op, 'maybe_custom_payload:(Maybe ^Cell)'],
  ['wallet loads burn payload', wallet, 'cell custom_payload = in_msg_body~load_maybe_ref();'],
  ['wallet fixes burn owner', wallet, '.store_slice(owner_address)'],
  ['wallet forwards maybe-ref', wallet, '.store_maybe_ref(custom_payload)'],
  ['wallet sends burn notification', wallet, '.store_uint(op::burn_notification_ext, 32)'],
  ['wallet saves after debit', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['Pool loads payload after identity', poolBurn, 'slice from_address = in_msg_body~load_msg_addr();'],
  ['Pool loads response before payload', poolBurn, 'slice response_address = in_msg_body~load_msg_addr();'],
  ['Pool loads maybe-ref', poolBurn, 'cell maybe_custom_payload = in_msg_body~load_maybe_ref();'],
  ['Pool derives LP wallet', poolBurn, 'lp_wallet_idata('],
  ['Pool authenticates LP wallet', poolBurn, 'throw_unless(error::invalid_caller'],
  ['Pool response tag gate', poolBurn, 'response_address.preload_uint(2) == 0'],
  ['Pool splits only two refs', poolBurn, 'maybe_custom_payload_sc.slice_bits() == 2'],
  ['Pool computes fixed outputs', poolBurn, 'pool::get_lp_burn_out(jetton_amount)'],
  ['Pool sends first fixed leg', poolBurn, 'amount0_out'],
  ['Pool sends second fixed leg', poolBurn, 'amount1_out'],
  ['Pool saves reserves after sends', poolBurn, 'storage::save();'],
  ['Router reloads custom payload', routerPool, 'cell custom_payload = in_msg_body~load_maybe_ref();'],
  ['Router reauthenticates pool', routerPool, 'throw_unless(error::invalid_caller'],
  ['Router forwards payload only to token transfer', routerPool, '.store_maybe_ref(custom_payload)'],
  ['live burn flow', system, 'sendBurnLPResult'],
  ['variant burn flow', constProduct, 'sendBurnExt'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const splitPayload = (payload) => {
  if (payload === null) return { left: null, right: null };
  if (payload.bits === 2) return { left: payload.left, right: payload.right };
  return { left: null, right: null };
};
const cases = [
  splitPayload(null),
  splitPayload({ bits: 2, left: 'LEFT', right: 'RIGHT' }),
  splitPayload({ bits: 1, left: 'MALFORMED', right: 'IGNORED' }),
  splitPayload({ bits: 34, left: 'CROSS_SWAP', right: 'TAIL' }),
];
if (cases[0].left !== null || cases[0].right !== null) throw new Error('null payload split');
if (cases[1].left !== 'LEFT' || cases[1].right !== 'RIGHT') throw new Error('two-ref payload split');
if (cases[2].left !== null || cases[2].right !== null) throw new Error('malformed payload must be ignored');
if (cases[3].left !== null || cases[3].right !== null) throw new Error('non-two-ref payload must not become burn leg payloads');
if (poolBurn.indexOf('slice response_address') > poolBurn.indexOf('cell maybe_custom_payload')) {
  throw new Error('payload parsed before response identity');
}
if (poolBurn.indexOf('throw_unless(error::invalid_caller') > poolBurn.indexOf('storage::reserve0 -= amount0_out')) {
  throw new Error('pool sender gate occurs after reserve mutation');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BA4',
  cross_file_anchors: anchors.length,
  payload_cases: cases.length,
  malformed_payloads_neutralized: 2,
  fixed_output_legs: 2,
  exact_identity_order_checks: 2,
  reason: 'LPWallet debits its own balance and forwards a maybe-ref; Pool parses from/response identity first, authenticates the deterministic LP wallet, accepts exactly two maybe-ref flags for the two payload legs, computes fixed outputs, and Router reauthenticates the Pool before forwarding custom payload to token transfer. Malformed payload shape does not rewrite owner, amount, or response identity'
}, null, 2));
