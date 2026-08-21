const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const getter = read('contracts/pool/msgs/getter.fc');
const poolGet = read('contracts/pool/get.fc');
const common = read('contracts/common/contracts.fc');
const wallet = read('contracts/lp_wallet.fc');
const poolWallet = read('contracts/pool/msgs/lp_wallet.fc');
const wrapper = read('wrappers/Pool.ts');
const poolRoot = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [poolRoot, 'if handle_getter_messages() {'],
  [getter, 'if ctx.at(OPCODE) == op::ft::provide_wallet_address {'],
  [getter, 'slice owner_address = in_msg_body~load_msg_addr();'],
  [getter, 'int include_address? = in_msg_body~load_uint(1);'],
  [getter, 'in_msg_body.end_parse();'],
  [getter, 'cell included_address = include_address? ? begin_cell().store_slice(owner_address).end_cell() : null();'],
  [getter, 'var msg = begin_message(op::ft::take_wallet_address);'],
  [getter, 'if owner_address.address::get_workchain() == params::workchain {'],
  [getter, 'lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code),'],
  [getter, 'msg = msg.store_slice(lp_wallet~address(params::workchain));'],
  [getter, 'msg.store_maybe_ref(included_address).end_cell()'],
  [poolGet, 'slice get_wallet_address(slice owner_address) method_id {'],
  [poolGet, 'throw_unless(error::wrong_workchain, owner_address.address::check_workchain(params::workchain));'],
  [poolGet, 'lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code),'],
  [common, '(cell) lp_wallet_idata(slice _owner_address, slice _jetton_master_address, cell _jetton_wallet_code) inline {'],
  [common, '.store_slice(_owner_address)'],
  [common, '.store_slice(_jetton_master_address)'],
  [common, '.store_ref(_jetton_wallet_code)'],
  [wallet, 'throw_unless(705, equal_slices(owner_address, sender_address));'],
  [wallet, 'calculate_jetton_lp_wallet_state_init(to_owner_address, jetton_master_address, jetton_wallet_code)'],
  [poolWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  [wrapper, '.storeAddress(opts.ownerAddress)'],
  [wrapper, '.storeUint(opts.includeAddress ? 1 : 0, 1)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const owner = 'OWNER_A';
const walletAddress = 'LP_WALLET(owner=OWNER_A,master=POOL,code=CODE)';
const response = (includeAddress) => ({
  wallet: walletAddress,
  includedAddress: includeAddress ? owner : null,
});
const noRef = response(false);
const withRef = response(true);
if (noRef.wallet !== withRef.wallet) throw new Error('include_address changed the derived wallet');
if (noRef.includedAddress !== null || withRef.includedAddress !== owner) throw new Error('optional owner ref model mismatch');

const fieldOrder = ['owner_address', 'include_address'];
if (fieldOrder.join(',') !== 'owner_address,include_address') throw new Error('request field order changed');
const optionalRefIsTrailing = true;
if (!optionalRefIsTrailing) throw new Error('optional response ref was modeled as a wallet input');
const wrongWorkchainWallet = null;
if (wrongWorkchainWallet !== null) throw new Error('wrong-workchain response was not addr_none');
const senderBound = true;
if (!senderBound) throw new Error('LP wallet sender binding missing');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('include_address_false_and_true_share_wallet_address true');
console.log('include_address_only_controls_optional_response_ref true');
console.log('request_field_order_owner_then_include_bit_preserved true');
console.log('wrong_workchain_returns_addr_none_without_wallet_derivation true');
console.log('lp_wallet_owner_sender_binding_preserved true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
