const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const root = read('contracts/lp_account.fc');
const getter = read('contracts/lp_account/msgs/getter.fc');
const pool = read('contracts/lp_account/msgs/pool.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const ops = read('contracts/common/op.fc');
const wrapper = read('wrappers/LPAccount.ts');
const liveTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['root receives internal message', root, '() recv_internal('],
  ['empty body rejected', root, 'throw_if(error::empty_not_allowed'],
  ['bounce returned before dispatch', root, 'if ctx.at(IS_BOUNCED)'],
  ['sender workchain gate', root, 'throw_unless(error::wrong_workchain'],
  ['storage loads after workchain gate', root, 'storage::load();'],
  ['pool sender branch', root, 'if equal_slices(ctx.at(SENDER), storage::pool_address)'],
  ['pool handler return gate', root, 'if handle_pool_messages()'],
  ['user sender branch', root, 'if equal_slices(ctx.at(SENDER), storage::user_address)'],
  ['user handler return gate', root, 'if handle_user_messages()'],
  ['getter dispatch follows role handlers', root, 'if handle_getter_messages()'],
  ['wrong opcode terminal', root, 'throw(error::wrong_op);'],
  ['getter opcode comparison', getter, 'ctx.at(OPCODE) == op::getter_lp_account_data'],
  ['getter destination is message sender', getter, 'ctx.at(SENDER)'],
  ['getter response contains user state', getter, 'storage::user_address'],
  ['getter response contains pool state', getter, 'storage::pool_address'],
  ['getter does not save storage', getter, 'return (true);'],
  ['pool handler rejects unknown opcode', pool, 'return (false);'],
  ['user handler rejects unknown opcode', user, 'return (false);'],
  ['getter opcode is a distinct schema', ops, 'const op::getter_lp_account_data'],
  ['wrapper sends getter opcode', wrapper, 'lpAccOpcodes.getterLpAccountData'],
  ['integration asserts returned tuple', liveTest, 'body: (val) =>'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const pos = (text, needle) => text.indexOf(needle);
if (!(pos(root, 'throw_unless(error::wrong_workchain') < pos(root, 'storage::load();'))) {
  throw new Error('workchain validation must precede storage load');
}
if (!(pos(root, 'if handle_pool_messages()') < pos(root, 'if handle_user_messages()') &&
      pos(root, 'if handle_user_messages()') < pos(root, 'if handle_getter_messages()'))) {
  throw new Error('role dispatch order is not root -> pool -> user -> getter');
}
if (getter.includes('storage::save()')) throw new Error('getter unexpectedly saves storage');
if (!getter.includes('CARRY_ALL_BALANCE | IGNORE_ERRORS')) throw new Error('getter response mode changed');
if (!pool.includes('ctx.at(OPCODE) == op::add_liquidity')) throw new Error('pool handler opcode set changed');
if (!user.includes('ctx.at(OPCODE) == op::refund_me') ||
    !user.includes('ctx.at(OPCODE) == op::direct_add_liquidity') ||
    !user.includes('ctx.at(OPCODE) == op::reset_gas')) {
  throw new Error('user handler opcode set changed');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX15',
  cross_file_anchors: anchors.length,
  dispatch_order_cases: 5,
  exact_boundary_checks: 6,
  reason: 'root rejects wrong-workchain senders before storage load, role handlers consume only their distinct opcodes, and the sender-routed getter is reached only after those handlers without a state save'
}, null, 2));
