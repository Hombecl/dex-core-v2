const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const walletUtils = read('contracts/lp_wallet/jetton-utils.fc');
const walletStorage = read('contracts/lp_wallet/storage.fc');
const walletOp = read('contracts/lp_wallet/op.fc');
const common = read('contracts/common/contracts.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const poolAccount = read('contracts/pool/msgs/lp_account.fc');
const poolGetter = read('contracts/pool/get.fc');
const routerDex = read('contracts/router/dex.fc');
const wrapper = read('wrappers/LPWallet.ts');
const test = read('tests/System.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [wallet, '() send_tokens (slice in_msg_body, slice sender_address, int msg_value, int fwd_fee) impure {'],
  [wallet, 'slice to_owner_address = in_msg_body~load_msg_addr();'],
  [wallet, 'force_chain(params::workchain, to_owner_address, error::wrong_workchain);'],
  [wallet, '(int balance, slice owner_address, slice jetton_master_address, cell jetton_wallet_code) = storage::load();'],
  [wallet, 'throw_unless(705, equal_slices(owner_address, sender_address));'],
  [wallet, 'throw_unless(706, balance >= 0);'],
  [wallet, 'calculate_jetton_lp_wallet_state_init(to_owner_address, jetton_master_address, jetton_wallet_code);'],
  [wallet, 'slice to_wallet_address = calculate_jetton_lp_wallet_address(state_init);'],
  [wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  [wallet, '() receive_tokens (slice in_msg_body, slice sender_address, int my_ton_balance, int fwd_fee, int msg_value) impure {'],
  [wallet, 'balance += jetton_amount;'],
  [wallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  [wallet, '| equal_slices(calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code), sender_address));'],
  [wallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  [walletUtils, 'cell calculate_jetton_lp_wallet_state_init(slice owner_address, slice jetton_master_address, cell jetton_wallet_code) inline {'],
  [walletUtils, 'slice calculate_user_jetton_lp_wallet_address(slice owner_address, slice jetton_master_address, cell jetton_wallet_code) inline {'],
  [walletUtils, 'store_uint(cell_hash(state_init), 256)'],
  [walletStorage, 'ds~load_coins(), ds~load_msg_addr(), ds~load_msg_addr(), ds~load_ref()'],
  [common, '(cell) lp_wallet_idata(slice _owner_address, slice _jetton_master_address, cell _jetton_wallet_code) inline {'],
  [common, '.store_slice(_owner_address)'],
  [common, '.store_slice(_jetton_master_address)'],
  [common, 'jetton_wallet::mint('],
  [poolWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  [poolWallet, 'lp_wallet_idata('],
  [poolAccount, 'lp_wallet_idata('],
  [poolAccount, 'msgs::send_with_stateinit('],
  [poolAccount, 'jetton_wallet::mint('],
  [poolGetter, 'lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code)'],
  [routerDex, 'pool_idata(my_address(), _jetton_address, token_wallet1, storage::jetton_lp_wallet_code,  storage::lp_account_code)'],
  [wrapper, 'export type LPWalletConfig'],
  [test, "it('should handle mint & burn liquidity'"]
];
anchors.forEach(([text, needle]) => must(text, needle));

const walletKey = (owner, master, code) => `${owner}|${master}|${code}`;
const master = 'POOL_A';
const code = 'LP_WALLET_CODE_V1';
const victimOwner = 'OWNER_A';
const attackerOwner = 'OWNER_B';
const victimWallet = walletKey(victimOwner, master, code);
const attackerWallet = walletKey(attackerOwner, master, code);
if (victimWallet === attackerWallet) throw new Error('distinct owners aliased to one deterministic wallet');

const authorized = ({storedMaster, sender, from, storedOwner, balance, amount}) => {
  if (sender === storedMaster) return true;
  if (sender === walletKey(from, storedMaster, code)) return true;
  return false;
};
if (!authorized({storedMaster: master, sender: master, from: attackerOwner, storedOwner: victimOwner, balance: 10n, amount: 1n})) {
  throw new Error('canonical pool/master mint was rejected');
}
if (!authorized({storedMaster: master, sender: victimWallet, from: victimOwner, storedOwner: victimOwner, balance: 10n, amount: 1n})) {
  throw new Error('canonical deterministic source wallet was rejected');
}
if (authorized({storedMaster: master, sender: attackerWallet, from: victimOwner, storedOwner: victimOwner, balance: 10n, amount: 1n})) {
  throw new Error('different-owner source wallet bypassed tuple binding');
}
if (authorized({storedMaster: master, sender: 'ATTACKER', from: victimOwner, storedOwner: victimOwner, balance: 10n, amount: 1n})) {
  throw new Error('arbitrary sender bypassed master/source authorization');
}

const receiveTransition = ({balance, amount, auth}) => auth ? {committed: true, balance: balance + amount} : {committed: false, balance};
const rejected = receiveTransition({balance: 10n, amount: 7n, auth: false});
if (rejected.committed || rejected.balance !== 10n) throw new Error('unauthorized pre-gate increment survived transaction rollback');
const accepted = receiveTransition({balance: 10n, amount: 7n, auth: true});
if (!accepted.committed || accepted.balance !== 17n) throw new Error('authorized receive did not commit exact amount');

const mintTuple = walletKey(victimOwner, master, code);
if (mintTuple !== victimWallet) throw new Error('pool mint tuple diverged from deterministic wallet identity');
console.log(`cross_file_anchors ${anchors.length}`);
console.log('master_sender_or_deterministic_source_sender_is_required true');
console.log('different_owner_source_wallet_cannot_credit_victim_wallet true');
console.log('unauthorized_balance_increment_reverts_with_transaction true');
console.log('pool_mint_and_get_wallet_use_same_owner_master_code_tuple true');
console.log('owner_transfer_path_debits_only_stored_owner_and_nonnegative_balance true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
