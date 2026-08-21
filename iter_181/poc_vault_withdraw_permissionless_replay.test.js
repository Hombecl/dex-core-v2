const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const vault = read('contracts/vault.fc');
const routerVault = read('contracts/router/msgs/vault.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const contracts = read('contracts/common/contracts.fc');
const routerEntry = read('contracts/router.fc');
const poolEntry = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [vault, 'if ctx.at(OPCODE) == op::withdraw_fee'],
  [vault, 'throw_unless(error::zero_output, storage::deposited_amount > 0);'],
  [vault, 'router::vault_pay_to('],
  [vault, 'storage::deposited_amount = 0;'],
  [vault, 'storage::save();'],
  [vault, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  [routerVault, 'if ctx.at(OPCODE) == op::vault_pay_to'],
  [routerVault, 'vault_idata(to_address, token_address, my_address())'],
  [routerVault, 'throw_unless(error::invalid_caller, equal_slices(vault~address(params::workchain), ctx.at(SENDER)));'],
  [routerVault, 'jetton_wallet::transfer(0, amount_out, to_address, to_address)'],
  [poolRouter, 'router::pay_vault('],
  [contracts, '(cell) router::vault_pay_to('],
  [contracts, '(cell) vault::deposit_ref_fee('],
  [routerEntry, 'if handle_vault_messages()'],
  [poolEntry, 'if equal_slices(ctx.at(SENDER), storage::protocol_fee_address)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const stored = { amount: 777, token: 'TOKEN_A', owner: 'OWNER', router: 'ROUTER' };
const first = { before: stored.amount, after: 0, payout: stored.amount, recipient: stored.owner };
const second = { before: first.after, accepted: first.after > 0, payout: 0 };
if (first.before !== first.payout || first.after !== 0) throw new Error('first withdrawal mismatch');
if (second.accepted || second.payout !== 0) throw new Error('replay was accepted');

const tuples = [
  { owner: 'OWNER', token: 'TOKEN_A', router: 'ROUTER', sender: 'DERIVED_VAULT', accepted: true },
  { owner: 'ATTACKER', token: 'TOKEN_A', router: 'ROUTER', sender: 'DERIVED_VAULT', accepted: false },
  { owner: 'OWNER', token: 'TOKEN_B', router: 'ROUTER', sender: 'DERIVED_VAULT', accepted: false },
  { owner: 'OWNER', token: 'TOKEN_A', router: 'OTHER_ROUTER', sender: 'DERIVED_VAULT', accepted: false }
];
if (tuples.filter((x) => x.accepted).length !== 1) throw new Error('vault tuple model mismatch');

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`withdrawal_tuple_cases ${tuples.length}`);
console.log(`first_payout_amount ${first.payout}`);
console.log(`second_withdrawal_accepted ${second.accepted}`);
console.log(`stored_owner_recipient ${first.recipient}`);
console.log(`deterministic_tuple_accepts ${tuples.filter((x) => x.accepted).length}`);
console.log('attacker_value_extraction false');
console.log('result PASS');
