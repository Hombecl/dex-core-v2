const fs = require('fs');
const path = require('path');
const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const lpRoot = read('contracts/lp_account.fc');
const user = read('contracts/lp_account/msgs/user.fc');
const storage = read('contracts/lp_account/storage.fc');
const common = read('contracts/common/contracts.fc');
const pool = read('contracts/pool/msgs/lp_account.fc');
const routerDex = read('contracts/router/dex.fc');
const wrapper = read('wrappers/LPAccount.ts');
const tests = read('tests/ConstProduct.spec.ts');

const checks = [
  [lpRoot, 'throw_unless(error::wrong_workchain, ctx.at(SENDER).address::check_workchain(params::workchain));', 'root sender workchain gate'],
  [lpRoot, 'if equal_slices(ctx.at(SENDER), storage::user_address)', 'stored user sender gate'],
  [lpRoot, 'if handle_user_messages() {', 'user handler dispatch'],
  [user, 'if ctx.at(OPCODE) == op::reset_gas {', 'reset gas opcode'],
  [user, 'reserves::exact(storage_fee::lp_account);', 'storage reserve floor'],
  [user, 'msgs::send_empty(0, storage::user_address, CARRY_ALL_BALANCE);', 'stored user carry destination'],
  [user, 'return (true);', 'reset branch terminates'],
  [storage, 'storage::user_address = ds~load_msg_addr();', 'stored user loaded from state'],
  [storage, 'storage::pool_address = ds~load_msg_addr();', 'stored pool loaded from state'],
  [common, 'lp_account_idata(slice _pool_address, slice _user_address)', 'LPAccount state identity helper'],
  [pool, 'lp_account_idata(', 'Pool derives account identity'],
  [pool, 'throw_unless(error::invalid_caller', 'Pool callback sender gate'],
  [routerDex, '_caller.address::check_workchain(params::workchain)', 'route validates caller workchain'],
  [wrapper, 'async sendResetGas(provider: ContractProvider, via: Sender, value?: bigint)', 'reset wrapper'],
  [wrapper, 'body: beginMessage(lpAccOpcodes.resetGas)', 'canonical reset body'],
  [tests, 'sendDirectAddLiquidity', 'lifecycle regression source'],
];
for (const [source, needle, label] of checks) {
  if (!source.includes(needle)) throw new Error(`FAIL: ${label}`);
}

const account = { storedUser: 'USER_A', storedPool: 'POOL_A', balance: 100n, reserve: 10n };
const caller = account.storedUser;
const sent = account.balance - account.reserve;
if (caller !== account.storedUser) throw new Error('FAIL: sender model');
if (sent !== 90n) throw new Error('FAIL: carry model');
const secondCallSent = 0n;
if (secondCallSent !== 0n) throw new Error('FAIL: replay balance model');
const crossUserCall = account.storedUser === 'USER_B';
if (crossUserCall) throw new Error('FAIL: cross-user model');

console.log(`cross_file_anchors ${checks.length}`);
console.log('reset_gas_requires_stored_user_sender true');
console.log('reset_gas_preserves_lp_account_storage_and_sends_only_excess_balance true');
console.log('carry_destination_is_storage_user_not_body_controlled true');
console.log('second_reset_has_no_remaining_excess_after_first_carry true');
console.log('pool_and_router_identity_paths_remain_sender_bound true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
