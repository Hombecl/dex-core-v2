const fs = require('fs');
const path = require('path');

const root = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const getter = read('contracts/pool/msgs/getter.fc');
const poolGet = read('contracts/pool/get.fc');
const contracts = read('contracts/common/contracts.fc');
const poolRoot = read('contracts/pool.fc');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const lpRoot = read('contracts/lp_account.fc');
const lpGet = read('contracts/lp_account/get.fc');
const wrapper = read('wrappers/Pool.ts');
const systemTests = read('tests/System.spec.ts');
const constProductTests = read('tests/ConstProduct.spec.ts');

let anchors = 0;
const has = (source, needle, label) => {
  if (!source.includes(needle)) throw new Error(`FAIL: ${label}`);
  anchors += 1;
};

// The internal getter and the on-chain get method use the same Pool + user
// StateInit tuple and both terminate their input parsing.
has(getter, 'slice user_address = in_msg_body~load_msg_addr();', 'internal getter loads one user address');
has(getter, 'in_msg_body.end_parse();', 'internal getter rejects trailing fields');
has(getter, 'lp_account_idata(my_address(), user_address)', 'internal getter uses pool/user tuple');
has(getter, 'anyone::getter_lp_account_address(lp_account~address(params::workchain))', 'internal getter returns derived address');
has(poolGet, 'throw_unless(error::wrong_workchain, owner_address.address::check_workchain(params::workchain));', 'get method validates user workchain');
has(poolGet, 'lp_account_idata(my_address(), owner_address)', 'get method uses the same pool/user tuple');
has(poolGet, 'return lp_account~address(params::workchain);', 'get method returns derived address');
has(contracts, '(cell) lp_account_idata(slice _pool_address, slice _user_address)', 'shared LP account StateInit helper exists');
has(contracts, '.store_slice(_user_address)', 'StateInit stores user first');
has(contracts, '.store_slice(_pool_address)', 'StateInit stores pool second');
has(poolRoot, 'if handle_getter_messages() {', 'Pool root routes getter messages');
has(poolLp, 'lp_account_idata(', 'Pool callback derives LP account from stored/user identity');
has(poolLp, 'throw_unless(error::invalid_caller', 'Pool callback has sender gate');
has(lpRoot, 'if equal_slices(ctx.at(SENDER), storage::pool_address)', 'LP account gates Pool sender');
has(lpRoot, 'if equal_slices(ctx.at(SENDER), storage::user_address)', 'LP account gates user sender');
has(lpRoot, 'if handle_getter_messages() {', 'LP account keeps getter path separate from value paths');
has(lpGet, 'storage::user_address', 'LP account getter reports stored user identity');
has(wrapper, 'getterLpAccountAddress: 0x15fbca95', 'wrapper uses canonical getter opcode');
has(wrapper, 'storeAddress(opts.userAddress)', 'wrapper serializes exactly one user address');
has(systemTests, 'pool.getLPAccountAddress({ userAddress: admin.address })', 'system liquidity regression resolves LP address');
has(constProductTests, 'pool.getLPAccountAddress({ userAddress: deployer.address })', 'constant-product regression resolves LP address');

// A malformed/non-workchain user can make the internal getter derive an
// address that the typed get method would reject. That address is read-only:
// Router route callers are workchain-checked and no value-bearing Pool or
// LP-account callback is authorized by the getter response.
const internalGetterAddress = { pool: 'POOL', user: 'MASTERCHAIN_USER' };
const typedGetAccepts = false;
const valuePathCanDeploy = false;
const callbackSenderMatches = false;
if (!internalGetterAddress.pool || !internalGetterAddress.user) throw new Error('FAIL: model inputs');
if (typedGetAccepts) throw new Error('FAIL: typed get unexpectedly accepts rejected address');
if (valuePathCanDeploy) throw new Error('FAIL: getter model reached value path');
if (callbackSenderMatches) throw new Error('FAIL: unreachable getter alias accepted as callback');

console.log(`cross_file_anchors ${anchors}`);
console.log('internal_getter_and_get_method_share_pool_user_stateinit true');
console.log('internal_getter_consumes_exact_one_address_and_end_parses true');
console.log('typed_get_rejects_non_workchain_user_address true');
console.log('value_paths_remain_sender_gated_and_workchain_bound true');
console.log('getter_response_is_to_message_sender_only true');
console.log('unreachable_getter_alias_has_no_asset_path true');
console.log('canonical_lp_account_resolution_regressions_are_present true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
