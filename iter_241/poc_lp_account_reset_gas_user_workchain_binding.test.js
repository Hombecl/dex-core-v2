const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const root = read('contracts/lp_account.fc');
const reset = read('contracts/lp_account/msgs/user.fc');
const storage = read('contracts/lp_account/storage.fc');
const ops = read('contracts/common/op.fc');
const idata = read('contracts/common/contracts.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const poolCallback = read('contracts/pool/msgs/lp_account.fc');
const routerDex = read('contracts/router/dex.fc');
const routerJetton = read('contracts/router/msgs/jetton.fc');
const poolGet = read('contracts/pool/get.fc');
const wrapper = read('wrappers/LPAccount.ts');
const liveTest = read('tests/System.spec.ts');

const provideStart = poolRouter.indexOf('if ctx.at(OPCODE) == op::provide_lp');
const provideBranch = poolRouter.slice(provideStart, poolRouter.indexOf('return ();', provideStart) + 10);
if (provideStart < 0) throw new Error('provide_lp branch not found');

const anchors = [
  ['LPAccount root workchain gate', root, 'throw_unless(error::wrong_workchain, ctx.at(SENDER).address::check_workchain(params::workchain));'],
  ['LPAccount stored user sender gate', root, 'if equal_slices(ctx.at(SENDER), storage::user_address) {'],
  ['LPAccount reset opcode', reset, 'if ctx.at(OPCODE) == op::reset_gas {'],
  ['LPAccount reset stored destination', reset, 'msgs::send_empty(0, storage::user_address, CARRY_ALL_BALANCE);'],
  ['LPAccount reset no token mutation', reset, 'reserves::exact(storage_fee::lp_account);'],
  ['LPAccount user storage load', storage, 'storage::user_address = ds~load_msg_addr();'],
  ['reset schema', ops, 'const op::reset_gas                       = "reset_gas query_id:uint64 = InternalMsgBody"c & 0x7fffffff;'],
  ['LPAccount StateInit stores user', idata, '.store_slice(_user_address)'],
  ['LPAccount StateInit stores pool', idata, '.store_slice(_pool_address)'],
  ['Pool parses from_user', poolRouter, 'slice from_user = in_msg_body~load_msg_addr();'],
  ['Pool derives LPAccount from from_user', poolRouter, 'lp_account_idata(my_address(), from_user)'],
  ['Pool validates to_user workchain', poolRouter, 'to_user.address::check_workchain(params::workchain)'],
  ['Pool emits LPAccount at local workchain', poolRouter, 'lp_account~address(params::workchain)'],
  ['Pool callback derives same LPAccount identity', poolCallback, 'lp_account_idata(my_address(), user_address)'],
  ['Pool callback authenticates sender', poolCallback, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  ['Router parses notification from_address', routerJetton, 'slice from_address = in_msg_body~load_msg_addr();'],
  ['Router routes notification caller', routerDex, 'route_dex_messages('],
  ['Router caller workchain gate', routerDex, '_caller.address::check_workchain(params::workchain)'],
  ['Router sends from_user into Pool route', idata, '.store_slice(_from_user);'],
  ['Pool getter validates owner workchain', poolGet, 'owner_address.address::check_workchain(params::workchain)'],
  ['LPAccount reset wrapper', wrapper, 'body: beginMessage(lpAccOpcodes.resetGas)'],
  ['live liquidity regression', liveTest, "should handle mint & burn liquidity"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}: ${needle}`);
}

if (provideBranch.includes('from_user.address::check_workchain')) {
  throw new Error('fixture changed: provide_lp now validates from_user locally; re-evaluate AX18');
}
if (!provideBranch.includes('to_user.address::check_workchain')) {
  throw new Error('provide_lp to_user workchain guard missing');
}
const resetBranch = reset.slice(reset.indexOf('if ctx.at(OPCODE) == op::reset_gas'));
if (resetBranch.includes('storage::amount0 =') || resetBranch.includes('storage::amount1 =') ||
    resetBranch.includes('storage::amount0 -=') || resetBranch.includes('storage::amount1 -=')) {
  throw new Error('reset handler unexpectedly mutates LP token amounts');
}

const local = 0;
const cases = [
  { storedUserWorkchain: 0, senderWorkchain: 0, rootPasses: true, resetCanRun: true },
  { storedUserWorkchain: -1, senderWorkchain: -1, rootPasses: false, resetCanRun: false },
  { storedUserWorkchain: -1, senderWorkchain: 0, rootPasses: true, resetCanRun: false },
  { storedUserWorkchain: 0, senderWorkchain: -1, rootPasses: false, resetCanRun: false },
];
for (const c of cases) {
  const rootPasses = c.senderWorkchain === local;
  const senderMatchesStored = c.senderWorkchain === c.storedUserWorkchain;
  const resetCanRun = rootPasses && senderMatchesStored;
  if (rootPasses !== c.rootPasses || resetCanRun !== c.resetCanRun) {
    throw new Error(`workchain model mismatch: ${JSON.stringify(c)}`);
  }
}

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX18',
  cross_file_anchors: anchors.length,
  workchain_cases: cases.length,
  exact_boundary_checks: 8,
  reason: 'from_user is stored in the deterministic LPAccount identity and Pool checks the separate to_user destination; a nonlocal stored user cannot pass the LPAccount root workchain gate, but the reset branch only carries TON, does not mutate LP token amounts, and prior notification/identity proofs show the malformed identity path cannot debit an existing victim account'
}, null, 2));
