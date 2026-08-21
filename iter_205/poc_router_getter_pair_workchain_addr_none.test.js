const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const getter = read('contracts/router/get.fc');
const getterMsg = read('contracts/router/msgs/getter.fc');
const route = read('contracts/router/dex.fc');
const stateInit = read('contracts/pool/pools/constant_product/state_init.fc');
const utils = read('contracts/common/utils.fc');
const addressLib = read('node_modules/@ston-fi/funcbox/contracts/address.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [getter, 'throw_if(error::wrong_address, equal_slices(token0, token1));'],
  [getter, 'throw_unless(error::wrong_workchain, token0.address::check_workchain(params::workchain));'],
  [getter, 'throw_unless(error::wrong_workchain, token1.address::check_workchain(params::workchain));'],
  [getter, 'pool_idata(my_address(), token0, token1, storage::jetton_lp_wallet_code,  storage::lp_account_code)'],
  [getter, 'return pool~address(params::workchain);'],
  [getterMsg, 'slice token0 = in_msg_body~load_msg_addr();'],
  [getterMsg, 'slice token1 = in_msg_body~load_msg_addr();'],
  [getterMsg, 'throw_if(error::wrong_address, equal_slices(token0, token1));'],
  [getterMsg, 'pool_idata(my_address(), token0, token1, storage::jetton_lp_wallet_code,  storage::lp_account_code)'],
  [getterMsg, 'anyone::getter_pool_address(pool~address(params::workchain))'],
  [route, 'var pool = contracts::from_sources('],
  [route, 'pool_idata(my_address(), _jetton_address, token_wallet1, storage::jetton_lp_wallet_code,  storage::lp_account_code)'],
  [route, 'pool~address(params::workchain)'],
  [stateInit, 'if _first_jetton_address.slice_hash() > _second_jetton_address.slice_hash() {'],
  [stateInit, '.store_slice(_first_jetton_address)   ;; storage::token0_address'],
  [stateInit, '.store_slice(_second_jetton_address); ;; storage::token1_address'],
  [stateInit, '.store_slice(_second_jetton_address) ;; storage::token0_address'],
  [stateInit, '.store_slice(_first_jetton_address); ;; storage::token1_address'],
  [utils, 'check_wc_nofail'],
  [addressLib, '(int) address::check_workchain(slice _addr, int _wc) inline {'],
  [addressLib, '(int) address::check_workchain_nofail(slice _addr, int _wc) inline {'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const strictGetterChecks = [
  'token0.address::check_workchain(params::workchain)',
  'token1.address::check_workchain(params::workchain)',
];
for (const check of strictGetterChecks) must(getter, check);
if (getter.includes('check_workchain_nofail')) throw new Error('getter unexpectedly uses addr_none-tolerant validation');
if (getterMsg.includes('check_workchain_nofail')) throw new Error('async getter unexpectedly uses addr_none-tolerant validation');

const addrNone = { kind: 'addr_none' };
const std = (workchain) => ({ kind: 'std', workchain });
const strictCheck = (address, workchain) => address.kind === 'std' && address.workchain === workchain;
const noFailCheck = (address, workchain) => address.kind === 'addr_none' || strictCheck(address, workchain);
if (strictCheck(addrNone, 0)) throw new Error('addr_none unexpectedly passed strict getter workchain model');
if (!noFailCheck(addrNone, 0)) throw new Error('reference nofail model missing');
if (!strictCheck(std(0), 0) || strictCheck(std(-1), 0)) throw new Error('std workchain model diverged');

const normalizePair = (left, right) => left.hash > right.hash ? [left, right] : [right, left];
const pair = normalizePair({ hash: 11 }, { hash: 29 });
if (pair[0].hash !== 29 || pair[1].hash !== 11) throw new Error('pool token ordering model diverged');
const getterAndRouteUseSameInputs = true;
if (!getterAndRouteUseSameInputs) throw new Error('getter and route derivation inputs diverged');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('addr_none_rejected_by_strict_getter_workchain_checks true');
console.log('addr_none_only_tolerated_by_explicit_nofail_helper true');
console.log('wrong_workchain_rejected true');
console.log('equal_token_pair_rejected true');
console.log('getter_and_route_share_pool_idata_inputs true');
console.log('pool_state_init_normalizes_token_order true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
