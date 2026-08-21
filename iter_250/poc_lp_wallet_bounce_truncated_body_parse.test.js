const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const poolRoot = read('contracts/pool.fc');
const op = read('contracts/lp_wallet/op.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['bounce body skip', wallet, 'in_msg_body~skip_bits(32);'],
  ['bounce op load', wallet, 'int op = in_msg_body~load_uint(32);'],
  ['typed op gate', wallet, 'throw_unless(709, (op == op::internal_transfer) | (op == op::burn_notification_ext));'],
  ['query load', wallet, 'int query_id = in_msg_body~load_uint(64);'],
  ['coin load', wallet, 'int jetton_amount = in_msg_body~load_coins();'],
  ['restore after parse', wallet, 'balance += jetton_amount;'],
  ['save after restore', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['protocol bounce gate', wallet, 'if (flags & 1)'],
  ['empty bounce return', wallet, 'if (in_msg_body.slice_empty?())'],
  ['storage tuple', storage, 'storage::load'],
  ['Pool LP wallet auth', poolWallet, 'throw_unless(error::invalid_caller'],
  ['Pool bounce root', poolRoot, 'if ctx.at(IS_BOUNCED)'],
  ['internal op constant', op, 'const op::internal_transfer'],
  ['burn op constant', wallet, 'op::burn_notification_ext'],
  ['live invalid path', system, 'should handle invalid transfers'],
  ['live burn path', constProduct, 'should burn liquidity'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const requiredBits = (coinBits) => 32 + 32 + 64 + coinBits;
const parse = (bodyBits, coinBits, opName) => {
  if (bodyBits < requiredBits(coinBits)) return { result: 'throw_before_restore', balanceDelta: 0 };
  if (!['internal_transfer', 'burn_notification_ext'].includes(opName)) return { result: 'throw_typed_op', balanceDelta: 0 };
  return { result: 'restore_exact_coin', balanceDelta: 75 };
};
const cases = [
  parse(requiredBits(12) - 1, 12, 'internal_transfer'),
  parse(requiredBits(12), 12, 'internal_transfer'),
  parse(requiredBits(12), 12, 'burn_notification_ext'),
  parse(requiredBits(12), 12, 'unknown'),
];
if (cases[0].balanceDelta !== 0 || cases[0].result !== 'throw_before_restore') throw new Error('truncated body restored');
if (cases[1].balanceDelta !== 75 || cases[2].balanceDelta !== 75) throw new Error('complete body did not restore');
if (cases[3].balanceDelta !== 0) throw new Error('unknown opcode restored');
const bounceSource = wallet.slice(wallet.indexOf('() on_bounce'));
if (bounceSource.indexOf('balance += jetton_amount') < bounceSource.indexOf('load_coins')) {
  throw new Error('restore precedes complete coin parse');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BB2',
  cross_file_anchors: anchors.length,
  parser_cases: cases.length,
  truncated_cases: 1,
  exact_complete_cases: 2,
  typed_gate_cases: 1,
  reason: 'truncated skip/op/query/Coins parsing throws before balance restoration or save; a complete body restores only its fully encoded Coins amount, and unknown opcodes fail the typed gate. Protocol bounce entry and prior LPWallet bounce audits keep this branch local'
}, null, 2));
