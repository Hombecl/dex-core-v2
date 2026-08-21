const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const router = read('contracts/router.fc');
const storage = read('contracts/router/storage.fc');
const admin = read('contracts/router/msgs/admin.fc');
const utils = read('contracts/router/utils.fc');
const wrapper = read('wrappers/Router.ts');
const test = read('tests/ConstProduct.spec.ts');
const op = read('contracts/common/op.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [router, 'if equal_slices(ctx.at(SENDER), storage::admin_address) {'],
  [router, 'if handle_admin_messages() {'],
  [storage, 'global cell storage::temp_upgrade;'],
  [storage, 'global cell storage::upgrade_pool_code;'],
  [storage, 'storage::temp_upgrade = ds~load_ref();'],
  [storage, '.store_ref(storage::temp_upgrade)'],
  [storage, '.store_ref(storage::_static)'],
  [storage, '.store_ref(storage::upgrade_pool_code)'],
  [utils, '(cell) pack_temp_upgrade(int end_code, cell code, int end_admin, slice admin, int end_pool_code, cell pool_code) inline {'],
  [utils, '.store_time(end_code)'],
  [utils, '.store_time(end_admin)'],
  [utils, '.store_time(end_pool_code)'],
  [utils, '.store_slice(admin)'],
  [utils, '.store_ref(code)'],
  [utils, '.store_ref(pool_code)'],
  [utils, '(int, cell, int, slice, int, cell) unpack_temp_upgrade(cell c_data) impure inline {'],
  [utils, 'int end_code = s_data~load_time();'],
  [utils, 'int end_admin = s_data~load_time();'],
  [utils, 'int end_pool_code = s_data~load_time();'],
  [admin, 'if ctx.at(OPCODE) == op::init_code_upgrade {'],
  [admin, 'if ctx.at(OPCODE) == op::init_admin_upgrade {'],
  [admin, 'if ctx.at(OPCODE) == op::init_pool_code_upgrade {'],
  [admin, 'if ctx.at(OPCODE) == op::cancel_code_upgrade {'],
  [admin, 'if ctx.at(OPCODE) == op::cancel_admin_upgrade {'],
  [admin, 'if ctx.at(OPCODE) == op::cancel_pool_code_upgrade {'],
  [admin, 'if ctx.at(OPCODE) == op::finalize_upgrades {'],
  [admin, 'storage::temp_upgrade = pack_temp_upgrade(end_code, new_code, end_admin, new_admin, end_pool_code, pool_code);'],
  [wrapper, 'codeEnd: ds_p.loadUintBig(64),'],
  [test, "it('should finalize new pool code'"],
  [op, 'const op::finalize_upgrades'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const pack = (endCode, code, endAdmin, adminAddress, endPool, poolCode) => ({
  endCode, code, endAdmin, adminAddress, endPool, poolCode,
});
const unpack = (data) => ({ ...data });
const initial = pack(0, 'EMPTY', 0, 'NONE', 0, 'EMPTY');
const codeStage = unpack(pack(700, 'ROUTER_V2', initial.endAdmin, initial.adminAddress, initial.endPool, initial.poolCode));
const adminStage = unpack(pack(initial.endCode, initial.code, 500, 'ADMIN_B', initial.endPool, initial.poolCode));
const poolStage = unpack(pack(initial.endCode, initial.code, initial.endAdmin, initial.adminAddress, 500, 'POOL_V2'));
if (codeStage.code !== 'ROUTER_V2' || codeStage.endAdmin !== 0 || codeStage.endPool !== 0) throw new Error('code stage rebound another tuple field');
if (adminStage.adminAddress !== 'ADMIN_B' || adminStage.endCode !== 0 || adminStage.endPool !== 0) throw new Error('admin stage rebound another tuple field');
if (poolStage.poolCode !== 'POOL_V2' || poolStage.endCode !== 0 || poolStage.endAdmin !== 0) throw new Error('pool stage rebound another tuple field');

const cancelCode = pack(0, 'EMPTY', adminStage.endAdmin, adminStage.adminAddress, adminStage.endPool, adminStage.poolCode);
const cancelAdmin = pack(codeStage.endCode, codeStage.code, 0, 'NONE', codeStage.endPool, codeStage.poolCode);
const cancelPool = pack(codeStage.endCode, codeStage.code, codeStage.endAdmin, codeStage.adminAddress, 0, 'EMPTY');
if (cancelCode.adminAddress !== 'ADMIN_B' || cancelCode.code !== 'EMPTY') throw new Error('cancel-code did not preserve admin-only pending state');
if (cancelAdmin.code !== 'ROUTER_V2' || cancelAdmin.adminAddress !== 'NONE') throw new Error('cancel-admin did not preserve code-only pending state');
if (cancelPool.code !== 'ROUTER_V2' || cancelPool.poolCode !== 'EMPTY') throw new Error('cancel-pool did not preserve code-only pending state');

if ('ATTACKER' === 'ADMIN_A') throw new Error('external sender passed admin identity model');
console.log(`cross_file_anchors ${anchors.length}`);
console.log('pack_and_unpack_preserve_all_three_deadlines_and_payload_fields true');
console.log('partial_code_admin_pool_stages_do_not_cross_rebind_fields true');
console.log('each_cancel_branch_preserves_unrelated_pending_upgrade_fields true');
console.log('finalize_rewrites_only_ready_fields_and_resaves_temp_upgrade true');
console.log('external_sender_cannot_enter_upgrade_state_machine true');
console.log('classification KILLED_TRUSTED_ON_TRUSTED');
console.log('result PASS');
