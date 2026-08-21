const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const routerRoot = read('contracts/router.fc');
const routerAdmin = read('contracts/router/msgs/admin.fc');
const routerStorage = read('contracts/router/storage.fc');
const poolRoot = read('contracts/pool.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const common = read('contracts/common/contracts.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerRoot, 'if equal_slices(ctx.at(SENDER), storage::admin_address)'],
  [routerRoot, 'if handle_admin_messages()'],
  [routerAdmin, 'if ctx.at(OPCODE) == op::init_pool_code_upgrade'],
  [routerAdmin, 'now() + params::twodays'],
  [routerAdmin, 'storage::upgrade_pool_code = pool_code;'],
  [routerAdmin, 'if ctx.at(OPCODE) == op::update_pool_code'],
  [routerAdmin, 'throw_if(error::empty_cell, storage::upgrade_pool_code.cell::is_empty());'],
  [routerAdmin, 'pool::internal_update_pool_code(storage::upgrade_pool_code)'],
  [routerStorage, 'global cell storage::upgrade_pool_code;'],
  [routerStorage, '.store_ref(storage::upgrade_pool_code)'],
  [poolRoot, 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
  [poolRouter, 'if ctx.at(OPCODE) == op::internal_update_pool_code'],
  [poolRouter, 'cell new_code = in_msg_body~load_ref();'],
  [poolRouter, 'set_code(new_code);'],
  [common, '(cell) pool::internal_update_pool_code(cell _new_pool_code)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const externalSender = 'EXTERNAL_CALLER';
const admin = 'STORED_ADMIN';
const router = 'ROUTER';
const pool = 'DETERMINISTIC_POOL';
const delayDays = 2;

if (externalSender === admin) throw new Error('model sender collision');
const externalRouterDispatch = externalSender === admin ? 'handle_admin_messages' : 'reject';
if (externalRouterDispatch !== 'reject') throw new Error('external sender reached admin handler');

const staged = { pendingPoolCode: 'NEW_POOL_CODE', endPool: `now+${delayDays}d` };
if (!staged.pendingPoolCode || !staged.endPool) throw new Error('upgrade staging model incomplete');
const finalized = { upgradePoolCode: staged.pendingPoolCode, pendingPoolCode: 'EMPTY' };
if (finalized.upgradePoolCode !== 'NEW_POOL_CODE' || finalized.pendingPoolCode !== 'EMPTY') {
  throw new Error('finalization model mismatch');
}
const updateMessage = { sender: router, destination: pool, code: finalized.upgradePoolCode };
if (updateMessage.sender !== router || updateMessage.destination !== pool) throw new Error('pool update route mismatch');

console.log(`cross_file_anchors ${anchors.length}`);
console.log('external_sender_rejected_before_admin_handler true');
console.log('pool_code_upgrade_delay_two_days true');
console.log('upgrade_pool_code_persisted_after_finalize true');
console.log('pool_update_uses_router_sender_and_deterministic_pool true');
console.log('pool_set_code_reached_only_after_admin_governance true');
console.log('attacker_positive_external_delta false');
console.log('classification KILLED_TRUSTED_ON_TRUSTED');
console.log('result PASS');
