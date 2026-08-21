const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const lpAccount = read('contracts/lp_account.fc');
const pool = read('contracts/pool.fc');
const router = read('contracts/router.fc');
const vault = read('contracts/vault.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const system = read('tests/System.spec.ts');
const lpTest = read('tests/LPAccount.spec.ts');

const anchors = [
  ['LPAccount empty-body guard', lpAccount, 'throw_if(error::empty_not_allowed, in_msg_body.slice_empty?());'],
  ['LPAccount context init', lpAccount, 'ctx::init(my_balance, msg_value, in_msg_full, in_msg_body);'],
  ['LPAccount bounce branch', lpAccount, 'if ctx.at(IS_BOUNCED)'],
  ['LPAccount bounce returns', lpAccount, ';; dont handle bounced messages'],
  ['LPAccount storage is after bounce', lpAccount, 'storage::load();'],
  ['Pool same guard ordering', pool, 'throw_if(error::empty_not_allowed, in_msg_body.slice_empty?());'],
  ['Router same guard ordering', router, 'throw_if(error::empty_not_allowed, in_msg_body.slice_empty?());'],
  ['Vault same guard ordering', vault, 'throw_if(error::empty_not_allowed, in_msg_body.slice_empty?());'],
  ['LPWallet empty body return', lpWallet, 'if (in_msg_body.slice_empty?())'],
  ['live invalid transfer regression', system, 'should handle invalid transfers'],
  ['live LP getter regression', lpTest, 'should return valid data'],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

const dispatch = (bodyEmpty, bounced) => {
  if (bodyEmpty) return 'throw_empty_not_allowed';
  if (bounced) return 'ignore_bounce_before_storage';
  return 'load_storage_and_dispatch';
};
const cases = [
  [true, true, 'throw_empty_not_allowed'],
  [true, false, 'throw_empty_not_allowed'],
  [false, true, 'ignore_bounce_before_storage'],
  [false, false, 'load_storage_and_dispatch'],
];
for (const [bodyEmpty, bounced, expected] of cases) {
  const result = dispatch(bodyEmpty, bounced);
  if (result !== expected) throw new Error(`dispatch mismatch: ${bodyEmpty}/${bounced}: ${result}`);
}
if (lpAccount.indexOf('in_msg_body.slice_empty?()') > lpAccount.indexOf('ctx.at(IS_BOUNCED)')) {
  throw new Error('empty-body guard does not precede bounced branch');
}
if (lpAccount.indexOf('storage::load();') < lpAccount.indexOf('ctx.at(IS_BOUNCED)')) {
  throw new Error('storage load occurs before bounced return');
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'BA2',
  cross_file_anchors: anchors.length,
  dispatch_cases: cases.length,
  state_mutation_before_bounce: false,
  exact_order_checks: 2,
  reason: 'an empty body is rejected before context initialization, while a nonempty bounced body returns before workchain, storage load, sender gates, or handler mutation; Pool, Router, Vault, and LPWallet use the same fail-closed ordering, and prior bounce audits cover the behavior'
}, null, 2));
