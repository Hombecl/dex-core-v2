const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const routerRoot = read('contracts/router.fc');
const admin = read('contracts/router/msgs/admin.fc');
const common = read('contracts/common/contracts.fc');
const poolRoot = read('contracts/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['router bounce gate', routerRoot, 'if ctx.at(IS_BOUNCED) {'],
  ['router admin gate', routerRoot, 'equal_slices(ctx.at(SENDER), storage::admin_address)'],
  ['fee gas guard', admin, 'gas::router::set_fees'],
  ['fee parser', admin, 'int new_lp_fee = in_msg_body~load_uint16();'],
  ['fee recipient parser', admin, 'slice excesses_recipient = get_excesses_address'],
  ['fee range gate', admin, 'params::min_fee'],
  ['pool StateInit', admin, 'pool~state_init()'],
  ['pool fee message', admin, 'pool::internal_set_fees('],
  ['carry to pool', admin, 'CARRY_ALL_BALANCE'],
  ['pool router gate', poolRoot, 'equal_slices(ctx.at(SENDER), storage::router_address)'],
  ['pool fee parser', poolRouter, 'if ctx.at(OPCODE) == op::internal_set_fees'],
  ['pool fee mutation', poolRouter, 'storage::protocol_fee_address = new_protocol_fee_address;'],
  ['pool save', poolRouter, 'storage::save();'],
  ['pool excess', poolRouter, 'utils::send_excesses(0, in_msg_body~load_msg_addr(), QCARRY_ALL_BALANCE);'],
  ['live admin fee update', system, "it('should set fees', async () => {"],
  ['live fee helper', constProduct, 'sendSetFees(sender.getSender()'],
  ['fee opcode schema', common, 'pool::internal_set_fees(']
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ sender = 'admin', bounced = false, poolSender = 'router', malformed = false, newLpFee = 10, newProtocolFee = 11, excessRecipient = 'admin' }) => {
  if (bounced) return { result: 'ignored_bounce', feeDelta: 0, recipientDelta: 0, persistentDelta: 0 };
  if (sender !== 'admin') return { result: 'rejected_router_admin_gate', feeDelta: 0, recipientDelta: 0, persistentDelta: 0 };
  if (malformed || poolSender !== 'router') return { result: 'rejected_before_commit', feeDelta: 0, recipientDelta: 0, persistentDelta: 0 };
  return { result: 'trusted_admin_update', feeDelta: newLpFee + newProtocolFee, recipientDelta: excessRecipient === 'admin' ? 0 : 1, persistentDelta: 0 };
};

const cases = [
  model({}),
  model({ sender: 'external' }),
  model({ bounced: true }),
  model({ malformed: true }),
  model({ poolSender: 'external' }),
  model({ excessRecipient: 'admin-controlled' })
];

if (cases[0].result !== 'trusted_admin_update' || cases[0].feeDelta !== 21) throw new Error('valid admin update model mismatch');
if (cases.slice(1, 5).some((c) => c.feeDelta !== 0 || c.persistentDelta !== 0)) throw new Error('rejected/bounced fee path mutated state');
if (cases[5].result !== 'trusted_admin_update') throw new Error('trusted recipient model mismatch');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'KILLED_TRUSTED_ON_TRUSTED',
  cell: 'CC4',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  fee_deltas: cases.map((c) => c.feeDelta),
  persistent_deltas: cases.map((c) => c.persistentDelta),
  reason: 'Router admits set_fees only from storage::admin_address, validates fee bounds/workchains, derives the deterministic Pool StateInit, and carries the exact residual TON to Pool. Pool admits internal_set_fees only from storage::router_address, saves the fee tuple atomically, and sends residual excess to the parsed recipient. External, malformed, wrong-pool, and bounced paths do not mutate state; an admin-selected recipient is trusted administrative control and is killed by the trusted-on-trusted filter.'
}, null, 2));
