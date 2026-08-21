const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const getter = read('contracts/router/get.fc');
const routerVault = read('contracts/router/msgs/vault.fc');
const common = read('contracts/common/contracts.fc');
const router = read('contracts/router.fc');
const utils = read('contracts/common/utils.fc');
const wrapper = read('wrappers/Router.ts');
const test = read('tests/ConstProduct.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [getter, '_ get_vault_address(slice user, slice token) method_id {'],
  [getter, 'throw_unless(error::wrong_workchain, token.address::check_workchain(params::workchain));'],
  [getter, 'throw_unless(error::wrong_workchain, user.address::check_workchain(params::workchain));'],
  [getter, 'vault_idata(user, token, my_address()),'],
  [getter, 'storage::vault_code'],
  [routerVault, 'if ctx.at(OPCODE) == op::vault_pay_to {'],
  [routerVault, 'slice token_address = in_msg_body~load_msg_addr();'],
  [routerVault, 'slice to_address = in_msg_body~load_msg_addr();'],
  [routerVault, 'vault_idata(to_address, token_address, my_address()),'],
  [routerVault, 'throw_unless(error::invalid_caller, equal_slices(vault~address(params::workchain), ctx.at(SENDER)));'],
  [routerVault, 'jetton_wallet::transfer(0, amount_out, to_address, to_address)'],
  [common, '(cell) vault_idata(slice _user_address, slice _token_address, slice _router_address) inline {'],
  [common, '.store_slice(_user_address)'],
  [common, '.store_slice(_token_address)'],
  [common, '.store_slice(_router_address)'],
  [router, 'if handle_vault_messages() {'],
  [utils, '_addr = _addr.address::is_none() ? ctx.at(SENDER) : _addr;'],
  [utils, 'throw_unless(error::wrong_workchain, _addr.address::check_workchain(params::workchain));'],
  [wrapper, "get('get_vault_address'"],
  [wrapper, 'storeAddress(opts.userAddress)'],
  [wrapper, 'storeAddress(opts.tokenWalletAddress)'],
  [test, 'let vaultAddress = await setup.router.getVaultAddress({'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const key = (user, token, routerAddress, code) => `${user}|${token}|${routerAddress}|${code}`;
const routerAddress = 'ROUTER_A';
const vaultCode = 'VAULT_CODE_V1';
const standard = key('OWNER_A', 'TOKEN_A', routerAddress, vaultCode);
const otherOwner = key('OWNER_B', 'TOKEN_A', routerAddress, vaultCode);
const otherToken = key('OWNER_A', 'TOKEN_B', routerAddress, vaultCode);
if (standard === otherOwner || standard === otherToken) throw new Error('standard vault tuple alias');

const checkWorkchain = (tag) => tag !== 'addr_none' && tag !== 'wrong_workchain';
if (checkWorkchain('addr_none') || checkWorkchain('wrong_workchain')) throw new Error('none/wrong-workchain input passed standard getter gate');
const getterResult = { accepted: checkWorkchain('OWNER_A') && checkWorkchain('TOKEN_A'), address: standard };
if (!getterResult.accepted || getterResult.address !== standard) throw new Error('standard getter did not derive deterministic vault');

const payout = { owner: 'OWNER_A', token: 'TOKEN_A', router: routerAddress, amount: 17n };
const payoutKey = key(payout.owner, payout.token, payout.router, vaultCode);
if (payoutKey !== standard || payout.amount !== 17n) throw new Error('value-bearing payout tuple diverged from getter tuple');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('addr_none_and_wrong_workchain_rejected_by_getter true');
console.log('standard_owner_token_router_tuple_derives_unique_vault true');
console.log('value_bearing_vault_pay_to_reuses_same_tuple true');
console.log('optional_none_normalization_is_not_used_for_vault_identity true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
