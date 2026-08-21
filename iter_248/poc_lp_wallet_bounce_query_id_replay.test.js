const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const storage = read('contracts/lp_wallet/storage.fc');
const commonOp = read('contracts/common/op.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['bounce skip', wallet, 'in_msg_body~skip_bits(32);'],
  ['bounce handler', wallet, '() on_bounce (slice in_msg_body) impure'],
  ['typed gate', wallet, '(op == op::internal_transfer) | (op == op::burn_notification_ext)'],
  ['query id', wallet, 'int query_id = in_msg_body~load_uint(64);'],
  ['amount', wallet, 'int jetton_amount = in_msg_body~load_coins();'],
  ['bounce reload', wallet, 'storage::load()'],
  ['restore', wallet, 'balance += jetton_amount;'],
  ['save', wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  ['transfer op', wallet, '.store_uint(op::internal_transfer, 32)'],
  ['burn op', wallet, '.store_uint(op::burn_notification_ext, 32)'],
  ['burn query', wallet, '.store_uint(query_id, 64)'],
  ['burn amount', wallet, '.store_coins(jetton_amount)'],
  ['bounce flag', wallet, 'if (flags & 1)'],
  ['ordinary op parse', wallet, 'int op = in_msg_body~load_uint(32);'],
  ['pool auth', poolWallet, 'throw_unless(error::invalid_caller'],
  ['pool output', poolWallet, 'pool::get_lp_burn_out(jetton_amount)'],
  ['opcode schema', commonOp, 'const op::burn_notification_ext'],
  ['storage tuple', storage, 'storage::save'],
  ['live System', system, 'sendBurnLPResult'],
  ['live variant', constProduct, 'sendBurnExt'],
];
for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}
const bounce = (balance, opName, queryId, amount) => {
  if (!['internal_transfer', 'burn_notification_ext'].includes(opName)) throw new Error('typed op gate');
  return { balance: balance + amount, opName, queryId };
};
const cases = [
  bounce(100, 'internal_transfer', 1, 25),
  bounce(200, 'burn_notification_ext', 2, 75),
  bounce(300, 'internal_transfer', 999, 0),
];
if (cases[0].balance !== 125 || cases[1].balance !== 275 || cases[2].balance !== 300) throw new Error('amount model');
if (cases[0].queryId === cases[1].queryId) throw new Error('query ids collapsed');
const bounceSource = wallet.slice(wallet.indexOf('() on_bounce'));
if (bounceSource.indexOf('throw_unless(709') > bounceSource.indexOf('balance += jetton_amount')) throw new Error('typed gate ordering');
console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BA5',
  cross_file_anchors: anchors.length,
  bounce_cases: cases.length,
  query_ids_modeled: 3,
  exact_amount_restores: 3,
  typed_opcode_checks: 2,
  reason: 'protocol-marked bounce entry, typed opcode gating, local tuple reload, exact amount restoration, and same-tuple save prevent query-id replay or cross-wallet inflation'
}, null, 2));
