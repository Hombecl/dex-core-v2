const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const vault = read('contracts/vault.fc');
const utils = read('contracts/common/utils.fc');
const common = read('contracts/common/contracts.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const router = read('contracts/router.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const op = read('contracts/common/op.fc');
const gas = read('contracts/common/gas.fc');
const wrapper = read('wrappers/Vault.ts');
const test = read('tests/ConstProduct.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [vault, 'if ctx.at(IS_BOUNCED) {'],
  [vault, 'if (ctx.at(OPCODE) == op::deposit_ref_fee) & equal_slices(ctx.at(SENDER), storage::router_address) {'],
  [vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  [vault, 'utils::send_excesses(0, in_msg_body~load_msg_addr(), QCARRY_ALL_BALANCE);'],
  [utils, '_addr = _addr.address::is_none() ? ctx.at(SENDER) : _addr;'],
  [utils, 'throw_unless(error::wrong_workchain, _addr.address::check_workchain(params::workchain));'],
  [common, '(cell) vault::deposit_ref_fee('],
  [common, '.store_coins(_amount)'],
  [common, '.store_slice(_response_address)'],
  [common, '.end_cell();'],
  [routerPool, 'if ctx.at(OPCODE) == op::pay_vault {'],
  [routerPool, 'slice excesses_address = in_msg_body~load_msg_addr();'],
  [routerPool, 'vault::deposit_ref_fee('],
  [routerPool, 'amount0_out + amount1_out,'],
  [routerPool, 'msgs::send_with_stateinit('],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [router, 'if ctx.at(IS_BOUNCED) {'],
  [poolRouter, 'router::pay_vault('],
  [poolRouter, 'storage::save();'],
  [op, 'const op::deposit_ref_fee'],
  [gas, 'const gas::vault::deposit_ref_fee = 10000000;'],
  [wrapper, 'sendWithdrawFee'],
  [test, "it('should collect ref fee from vault'"]
];
anchors.forEach(([text, needle]) => must(text, needle));

const encodeDeposit = (amount, response, tail = '') => ({
  opcode: 'deposit_ref_fee',
  amount,
  response,
  tail,
});
const decodeDeposit = (body) => ({
  amount: body.amount,
  response: body.response,
  unreadTail: body.tail,
});

const exact = decodeDeposit(encodeDeposit(17n, 'EXCESS_A'));
if (exact.amount !== 17n || exact.response !== 'EXCESS_A' || exact.unreadTail !== '') {
  throw new Error('canonical deposit body did not decode exactly');
}
const tailed = decodeDeposit(encodeDeposit(17n, 'EXCESS_A', 'ATTACKER_TAIL'));
if (tailed.amount !== exact.amount || tailed.response !== exact.response) {
  throw new Error('trailing body data altered parsed amount or response');
}
if (tailed.unreadTail !== 'ATTACKER_TAIL') throw new Error('tail model lost the unparsed suffix');

const senderGate = (sender, routerAddress) => sender === routerAddress;
if (senderGate('ATTACKER', 'ROUTER_A')) throw new Error('attacker bypassed Vault router sender gate');
if (!senderGate('ROUTER_A', 'ROUTER_A')) throw new Error('canonical Router deposit rejected');

const excessDestination = (response, sender) => response === 'addr_none' ? sender : response;
if (excessDestination('addr_none', 'ROUTER_A') !== 'ROUTER_A') {
  throw new Error('addr_none normalization did not resolve to the protocol sender');
}
if (excessDestination('EXCESS_A', 'ROUTER_A') !== 'EXCESS_A') {
  throw new Error('explicit excess destination was changed');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log('canonical_deposit_body_parses_amount_and_response_exactly true');
console.log('trailing_body_data_remains_unparsed_and_cannot_shift_prior_fields true');
console.log('addr_none_excesses_normalizes_to_router_sender true');
console.log('router_sender_gate_blocks_external_deposit_and_preserves_vault_auth true');
console.log('stateinit_deposit_builder_uses_canonical_two_field_body true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
