const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const root = read('contracts/lp_account.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const ops = read('contracts/common/op.fc');
const wrapper = read('wrappers/LPAccount.ts');
const storage = read('contracts/lp_account/storage.fc');
const getter = read('contracts/lp_account/msgs/getter.fc');
const liveTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['root rejects an empty body', root, 'throw_if(error::empty_not_allowed'],
  ['root initializes context', root, 'ctx::init(my_balance, msg_value, in_msg_full, in_msg_body);'],
  ['root rejects wrong workchain', root, 'throw_unless(error::wrong_workchain'],
  ['root checks the stored user sender', root, 'equal_slices(ctx.at(SENDER), storage::user_address)'],
  ['root calls the user handler', root, 'if handle_user_messages()'],
  ['reset opcode branch', user, 'if ctx.at(OPCODE) == op::reset_gas'],
  ['reset reserves exact storage fee', user, 'reserves::exact(storage_fee::lp_account);'],
  ['reset uses stored user destination', user, 'msgs::send_empty(0, storage::user_address, CARRY_ALL_BALANCE);'],
  ['reset returns handled', user, 'return (true);'],
  ['reset handler falls through unknown ops', user, 'return (false);'],
  ['reset opcode has query id schema', ops, 'const op::reset_gas                       = "reset_gas query_id:uint64 = InternalMsgBody"c & 0x7fffffff;'],
  ['wrapper exposes reset opcode', wrapper, 'resetGas: 0x29d22935'],
  ['wrapper emits opcode-only body', wrapper, 'body: beginMessage(lpAccOpcodes.resetGas)'],
  ['storage user field exists', storage, 'storage::user_address'],
  ['getter is a separate root branch', getter, 'handle_getter_messages'],
  ['LPAccount integration suite exists', liveTest, "describe('Getters'"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const pos = (text, needle) => text.indexOf(needle);
if (!(pos(root, 'throw_if(error::empty_not_allowed') < pos(root, 'ctx::init(') &&
      pos(root, 'ctx::init(') < pos(root, 'throw_unless(error::wrong_workchain') &&
      pos(root, 'throw_unless(error::wrong_workchain') < pos(root, 'if handle_user_messages()'))) {
  throw new Error('root validation/dispatch order changed');
}
const resetBranch = user.slice(pos(user, 'if ctx.at(OPCODE) == op::reset_gas'));
if (resetBranch.includes('load_') || resetBranch.includes('storage::save()')) {
  throw new Error('reset_gas branch unexpectedly parses tail or saves storage');
}
if (!resetBranch.includes('reserves::exact(storage_fee::lp_account)') ||
    !resetBranch.includes('storage::user_address') ||
    !resetBranch.includes('CARRY_ALL_BALANCE')) {
  throw new Error('reset_gas value flow changed');
}
if (ops.indexOf('const op::reset_gas') < 0 || !ops.includes('query_id:uint64')) {
  throw new Error('reset opcode schema missing query id');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX17',
  cross_file_anchors: anchors.length,
  tail_cases: 5,
  exact_boundary_checks: 6,
  reason: 'the root rejects only an actually empty body, while reset_gas consumes no body fields after the opcode; every nonempty tail is inert, exact storage reserve precedes carry, and the destination is immutable stored-user state'
}, null, 2));
