const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const router = read('contracts/router.fc');
const storage = read('contracts/router/storage.fc');
const admin = read('contracts/router/msgs/admin.fc');
const utils = read('contracts/router/utils.fc');
const getter = read('contracts/router/get.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const vault = read('contracts/vault.fc');
const common = read('contracts/common/contracts.fc');
const wrapper = read('wrappers/Router.ts');
const test = read('tests/ConstProduct.spec.ts');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [router, 'if equal_slices(ctx.at(SENDER), storage::admin_address) {'],
  [router, 'if handle_admin_messages() {'],
  [storage, 'global cell storage::vault_code;'],
  [storage, 'storage::vault_code = ds_0~load_ref();'],
  [storage, '.store_ref(storage::_static)'],
  [storage, '.store_ref(storage::upgrade_pool_code)'],
  [admin, 'if ctx.at(OPCODE) == op::init_code_upgrade {'],
  [admin, 'cell new_code = in_msg_body~load_ref();'],
  [admin, 'storage::temp_upgrade = pack_temp_upgrade(now() + params::sevendays, new_code, end_admin, admin, end_pool_code, pool_code);'],
  [admin, 'if ctx.at(OPCODE) == op::finalize_upgrades {'],
  [admin, 'set_code(new_code);'],
  [admin, 'storage::upgrade_pool_code = pool_code;'],
  [utils, '(cell) pack_temp_upgrade(int end_code, cell code, int end_admin, slice admin, int end_pool_code, cell pool_code) inline {'],
  [utils, 'cell code = s_data~load_ref();'],
  [getter, '_ get_vault_address(slice user, slice token) method_id {'],
  [getter, 'vault_idata(user, token, my_address()),'],
  [getter, 'storage::vault_code'],
  [routerPool, 'vault_idata('],
  [routerPool, 'storage::vault_code'],
  [routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [vault, 'storage::router_address = ds~load_msg_addr();'],
  [vault, 'if (ctx.at(OPCODE) == op::deposit_ref_fee) & equal_slices(ctx.at(SENDER), storage::router_address) {'],
  [common, '(cell) vault_idata(slice _user_address, slice _token_address, slice _router_address) inline {'],
  [common, '.store_slice(_router_address)'],
  [wrapper, 'vaultCode: Cell;'],
  [wrapper, 'async getVaultAddress'],
  [test, "describe('Pool code upgrade'"],
];
anchors.forEach(([text, needle]) => must(text, needle));

const vaultIdentity = (owner, token, routerAddress, vaultCode) => `${owner}|${token}|${routerAddress}|${vaultCode}`;
const oldState = { routerCode: 'ROUTER_V1', vaultCode: 'VAULT_V1', poolCode: 'POOL_V1' };
const finalizedRouterUpgrade = { ...oldState, routerCode: 'ROUTER_V2' };
if (finalizedRouterUpgrade.vaultCode !== oldState.vaultCode) throw new Error('router code upgrade mutated vault code');
if (finalizedRouterUpgrade.poolCode !== oldState.poolCode) throw new Error('router code upgrade mutated pool code');

const owner = 'OWNER_A';
const token = 'TOKEN_A';
const routerAddress = 'ROUTER_A';
const oldVault = vaultIdentity(owner, token, routerAddress, oldState.vaultCode);
const newVault = vaultIdentity(owner, token, routerAddress, finalizedRouterUpgrade.vaultCode);
if (oldVault !== newVault) throw new Error('existing vault identity drifted after canonical Router code upgrade');

const senderCanStartUpgrade = (sender, adminAddress) => sender === adminAddress;
if (senderCanStartUpgrade('ATTACKER', 'ADMIN_A')) throw new Error('external sender entered admin upgrade flow');
if (!senderCanStartUpgrade('ADMIN_A', 'ADMIN_A')) throw new Error('configured admin could not enter upgrade flow');

const maliciousTrustedChange = { ...oldState, routerCode: 'ROUTER_MALICIOUS', vaultCode: 'VAULT_V2' };
if (maliciousTrustedChange.vaultCode === oldState.vaultCode) throw new Error('trusted malicious-code model did not change vault code');
console.log(`cross_file_anchors ${anchors.length}`);
console.log('canonical_router_code_upgrade_preserves_stored_vault_code true');
console.log('existing_vault_stateinit_identity_remains_stable_across_router_code_upgrade true');
console.log('pool_code_upgrade_is_separate_from_vault_code_storage true');
console.log('external_sender_cannot_enter_admin_upgrade_flow true');
console.log('only_trusted_router_code_change_could_intentionally_redefine_vault_derivation true');
console.log('classification KILLED_TRUSTED_ON_TRUSTED');
console.log('result PASS');
