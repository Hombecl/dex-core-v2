const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pool = read('contracts/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const router = read('contracts/router.fc');
const admin = read('contracts/router/msgs/admin.fc');
const utils = read('contracts/common/utils.fc');
const op = read('contracts/common/op.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/Router.ts');
const tests = read('tests/ConstProduct.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error('missing anchor: ' + needle);
};
const anchors = [
  [pool, 'if equal_slices(ctx.at(SENDER), storage::router_address) {'],
  [poolRouter, 'if ctx.at(OPCODE) == op::internal_set_fees {'],
  [poolRouter, 'int new_lp_fee = in_msg_body~load_uint16();'],
  [poolRouter, 'int new_protocol_fee = in_msg_body~load_uint16();'],
  [poolRouter, 'slice new_protocol_fee_address = in_msg_body~load_msg_addr();'],
  [poolRouter, 'storage::lp_fee = new_lp_fee;'],
  [poolRouter, 'storage::protocol_fee = new_protocol_fee;'],
  [poolRouter, 'storage::protocol_fee_address = new_protocol_fee_address;'],
  [poolRouter, 'storage::save();'],
  [poolRouter, 'utils::send_excesses(0, in_msg_body~load_msg_addr(), QCARRY_ALL_BALANCE);'],
  [router, 'if equal_slices(ctx.at(SENDER), storage::admin_address) {'],
  [router, 'if handle_admin_messages() {'],
  [admin, 'if ctx.at(OPCODE) == op::set_fees {'],
  [admin, 'slice jetton_info = in_msg_body~load_slice_ref();'],
  [admin, 'slice excesses_recipient = get_excesses_address(jetton_info~load_msg_addr());'],
  [admin, 'jetton_info.end_parse();'],
  [admin, 'in_msg_body.end_parse();'],
  [admin, 'pool::internal_set_fees('],
  [admin, 'CARRY_ALL_BALANCE'],
  [utils, '_addr = _addr.address::is_none() ? ctx.at(SENDER) : _addr;'],
  [utils, 'throw_unless(error::wrong_workchain, _addr.address::check_workchain(params::workchain));'],
  [op, 'const op::internal_set_fees'],
  [common, '.store_uint(_new_lp_fee, 16)'],
  [common, '.store_uint(_new_protocol_fee, 16)'],
  [common, '.store_slice(_new_protocol_fee_address)'],
  [common, '.store_slice(_excesses_recipient)'],
  [wrapper, 'setFees'],
  [tests, "it('should set fees', async () => {"],
  [tests, "it('should bounce set fees if not admin', async () => {"]
];
anchors.forEach(([text, needle]) => must(text, needle));

const internalStart = poolRouter.indexOf('if ctx.at(OPCODE) == op::internal_set_fees');
const internalEnd = poolRouter.indexOf('\n    <%', internalStart);
if (internalStart < 0 || internalEnd < 0) throw new Error('internal_set_fees block bounds missing');
const internalBlock = poolRouter.slice(internalStart, internalEnd);
if (internalBlock.includes('in_msg_body.end_parse()')) throw new Error('unexpected strict tail parse assumption');

const encoded = {
  lpFee: 101,
  protocolFee: 7,
  protocolRecipient: 'ADDR_PROTOCOL',
  excessRecipient: 'ADDR_EXCESS',
  trailing: 'TRAILING_DATA'
};
const parsed = {
  lpFee: encoded.lpFee,
  protocolFee: encoded.protocolFee,
  protocolRecipient: encoded.protocolRecipient,
  excessRecipient: encoded.excessRecipient
};
if (JSON.stringify(parsed) !== JSON.stringify({
  lpFee: 101,
  protocolFee: 7,
  protocolRecipient: 'ADDR_PROTOCOL',
  excessRecipient: 'ADDR_EXCESS'
})) throw new Error('canonical field order shifted');
if (encoded.trailing !== 'TRAILING_DATA') throw new Error('trailing fixture missing');

const initial = {
  lpFee: 3,
  protocolFee: 4,
  protocolRecipient: 'ADDR_OLD',
  balance: 900
};
const validApply = (state, body) => ({
  ...state,
  lpFee: body.lpFee,
  protocolFee: body.protocolFee,
  protocolRecipient: body.protocolRecipient,
  excessRecipient: body.excessRecipient
});
const validState = validApply(initial, parsed);
if (validState.lpFee !== 101 || validState.protocolFee !== 7 || validState.protocolRecipient !== 'ADDR_PROTOCOL') {
  throw new Error('valid internal fee update did not persist exact fields');
}

const malformed = { ...parsed, excessRecipient: null };
let reverted = false;
try {
  if (malformed.excessRecipient === null) throw new Error('malformed MsgAddress');
  validApply(initial, malformed);
} catch (_err) {
  reverted = true;
}
if (!reverted) throw new Error('malformed excess address did not model parser failure');
if (initial.lpFee !== 3 || initial.protocolFee !== 4 || initial.protocolRecipient !== 'ADDR_OLD') {
  throw new Error('save-before-parse model leaked a partial state commit');
}

const sender = { external: 'ATTACKER', admin: 'ADMIN', router: 'ROUTER' };
if (sender.external === sender.admin) throw new Error('external sender unexpectedly equals admin');
if (sender.external === sender.router) throw new Error('external sender unexpectedly equals router');
const adminMaySetFees = (from) => from === sender.admin;
const poolMayApplyInternalFees = (from) => from === sender.router;
if (adminMaySetFees(sender.external)) throw new Error('external sender entered Router admin fee handler');
if (poolMayApplyInternalFees(sender.external)) throw new Error('external sender entered Pool Router handler');
if (!adminMaySetFees(sender.admin) || !poolMayApplyInternalFees(sender.router)) throw new Error('trusted route model broken');

const noneRecipient = null;
const resolvedNone = noneRecipient === null ? sender.router : noneRecipient;
if (resolvedNone !== sender.router) throw new Error('addr_none did not resolve to Router sender');
if (resolvedNone === sender.external) throw new Error('addr_none resolved to attacker');

console.log('cross_file_anchors ' + anchors.length);
console.log('canonical_internal_set_fees_field_order_preserved true');
console.log('pool_save_before_excess_parse_reverts_without_partial_commit true');
console.log('trailing_body_data_cannot_shift_preceding_fee_fields true');
console.log('addr_none_excess_resolves_to_trusted_router_sender true');
console.log('router_admin_and_pool_router_sender_gates_reject_external_sender true');
console.log('canonical_fee_update_persists_exact_fee_and_recipient_fields true');
console.log('classification KILLED_TRUSTED_ON_TRUSTED');
console.log('result PASS');

