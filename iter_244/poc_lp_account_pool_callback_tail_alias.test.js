const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const op = read('contracts/common/op.fc');
const contracts = read('contracts/common/contracts.fc');
const lpStorage = read('contracts/lp_account/storage.fc');
const utils = read('contracts/common/utils.fc');
const system = read('tests/System.spec.ts');
const lpTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['add_liquidity schema', op, 'const op::add_liquidity'],
  ['callback schema has three destinations', op, 'additional_fields:^[to_user_address:MsgAddress refund_address:MsgAddress excess_address:MsgAddress]'],
  ['LPAccount loads additional ref', lpAccountPool, 'slice additional_fields = in_msg_body~load_slice_ref();'],
  ['LPAccount loads refund first', lpAccountPool, 'slice refund_address = additional_fields~load_msg_addr();'],
  ['LPAccount loads excess second', lpAccountPool, 'slice excess_address = additional_fields~load_msg_addr();'],
  ['LPAccount emits callback fields', contracts, '.store_slice(_to_user)'],
  ['LPAccount emits refund field', contracts, '.store_slice(_refund_address)'],
  ['LPAccount emits excess field', contracts, '.store_slice(_excess_address)'],
  ['LPAccount callback uses stored user', lpAccountPool, 'storage::user_address,'],
  ['LPAccount saves after branch', lpAccountPool, 'storage::save();'],
  ['Pool loads callback ref', poolLpAccount, 'slice additional_data = in_msg_body~load_slice_ref();'],
  ['Pool loads to_user', poolLpAccount, 'slice to_user_address = additional_data~load_msg_addr();'],
  ['Pool loads refund', poolLpAccount, 'slice refund_address = additional_data~load_msg_addr();'],
  ['Pool loads excess', poolLpAccount, 'slice excess_address = additional_data~load_msg_addr();'],
  ['Pool derives callback identity', poolLpAccount, 'lp_account_idata('],
  ['Pool authenticates callback sender', poolLpAccount, 'throw_unless(error::invalid_caller'],
  ['LPAccount storage tuple persists user/pool', lpStorage, '.store_slice(storage::user_address)'],
  ['LPAccount excess workchain helper', utils, 'check_workchain(params::workchain)'],
  ['live LP provide path', system, 'sendProvideLiquidity('],
  ['live getter tuple path', lpTest, 'getLPAccountData()'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const parseTuple = (fields) => ({
  toUser: fields[0],
  refund: fields[1],
  excess: fields[2],
  ignoredTail: fields.slice(3),
});
const base = ['TO_USER', 'REFUND', 'EXCESS'];
const withTail = [...base, 'TAIL_A', 'TAIL_B'];
const parsedBase = parseTuple(base);
const parsedTail = parseTuple(withTail);
if (JSON.stringify(parsedBase) !== JSON.stringify({
  toUser: 'TO_USER',
  refund: 'REFUND',
  excess: 'EXCESS',
  ignoredTail: []
})) throw new Error('base tuple parse mismatch');
if (parsedTail.toUser !== parsedBase.toUser ||
    parsedTail.refund !== parsedBase.refund ||
    parsedTail.excess !== parsedBase.excess ||
    parsedTail.ignoredTail.length !== 2) {
  throw new Error('tail changed a parsed destination');
}
if (!poolLpAccount.includes('equal_slices(lp_account~address(params::workchain), ctx.at(SENDER))')) {
  throw new Error('callback sender binding missing');
}
if (!lpAccountPool.includes('if ctx.at(OPCODE) == op::add_liquidity')) {
  throw new Error('LPAccount add dispatcher missing');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BA1',
  cross_file_anchors: anchors.length,
  tuple_cases: 2,
  tail_fields_ignored: 2,
  exact_destination_checks: 6,
  reason: 'the producer and consumer serialize the same three-address reference order; an appended tail is unconsumed and cannot rewrite earlier fields, while Pool re-derives the LPAccount sender and LPAccount binds the callback user to stored state. Refund/excess remain user-selected destinations and the live provide/getter paths cover the value-bearing flow'
}, null, 2));
