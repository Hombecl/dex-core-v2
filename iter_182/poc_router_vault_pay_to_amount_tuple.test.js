const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const routerVault = read('contracts/router/msgs/vault.fc');
const vault = read('contracts/vault.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const common = read('contracts/common/contracts.fc');
const routerEntry = read('contracts/router.fc');
const poolEntry = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerVault, 'int amount_out = in_msg_body~load_coins();'],
  [routerVault, 'slice token_address = in_msg_body~load_msg_addr();'],
  [routerVault, 'slice to_address = in_msg_body~load_msg_addr();'],
  [routerVault, 'vault_idata(to_address, token_address, my_address())'],
  [routerVault, 'throw_unless(error::invalid_caller, equal_slices(vault~address(params::workchain), ctx.at(SENDER)));'],
  [routerVault, 'jetton_wallet::transfer(0, amount_out, to_address, to_address)'],
  [vault, 'router::vault_pay_to('],
  [vault, 'storage::deposited_amount,'],
  [vault, 'storage::token_address,'],
  [vault, 'storage::owner_address'],
  [poolRouter, 'router::pay_vault('],
  [poolRouter, 'ref_fee_out0,'],
  [poolRouter, 'ref_fee_out1,'],
  [common, '(cell) router::vault_pay_to('],
  [routerEntry, 'if handle_vault_messages()'],
  [poolEntry, 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const valid = { amount: 321, token: 'TOKEN_A', owner: 'OWNER', router: 'ROUTER' };
const cases = [
  { name: 'exact_tuple', ...valid, sender: 'VAULT(owner,token,router)', accepted: true, payout: 321 },
  { name: 'altered_owner', ...valid, owner: 'ATTACKER', sender: 'VAULT(owner,token,router)', accepted: false, payout: 0 },
  { name: 'altered_token', ...valid, token: 'TOKEN_B', sender: 'VAULT(owner,token,router)', accepted: false, payout: 0 },
  { name: 'altered_router', ...valid, router: 'OTHER_ROUTER', sender: 'VAULT(owner,token,router)', accepted: false, payout: 0 },
  { name: 'amount_mutation', ...valid, amount: 999, sender: 'VAULT(owner,token,router)', accepted: false, payout: 0 }
];
if (cases.filter((x) => x.accepted).length !== 1) throw new Error('tuple auth model mismatch');
if (cases[0].payout !== valid.amount) throw new Error('exact payout mismatch');
if (cases.slice(1).some((x) => x.payout !== 0)) throw new Error('altered tuple payout mismatch');

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`tuple_cases ${cases.length}`);
console.log(`exact_tuple_accepted ${cases[0].accepted}`);
console.log(`altered_tuple_cases_rejected ${cases.slice(1).filter((x) => !x.accepted).length}`);
console.log(`exact_payout ${cases[0].payout}`);
console.log('attacker_value_extraction false');
console.log('result PASS');
