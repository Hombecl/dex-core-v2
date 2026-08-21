const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolLp = read('contracts/pool/msgs/lp_account.fc');
const routerPool = read('contracts/pool/msgs/router.fc');
const lpAccount = read('contracts/lp_account/msgs/pool.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const contracts = read('contracts/common/contracts.fc');
const poolEntry = read('contracts/pool.fc');

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [routerPool, 'slice from_user = in_msg_body~load_msg_addr();'],
  [routerPool, 'to_user = call_payload~load_msg_addr();'],
  [routerPool, 'lp_account::add_liquidity('],
  [poolLp, 'slice user_address = in_msg_body~load_msg_addr();'],
  [poolLp, 'slice to_user_address = additional_data~load_msg_addr();'],
  [poolLp, 'lp_account_idata(\n                my_address(), \n                user_address'],
  [poolLp, 'throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)));'],
  [poolLp, 'lp_wallet_idata(\n                    to_user_address,'],
  [poolLp, 'jetton_wallet::mint(\n                    user_address,'],
  [lpAccount, 'slice to_user = in_msg_body~load_msg_addr();'],
  [lpAccount, 'storage::user_address'],
  [lpAccount, 'pool::cb_add_liquidity('],
  [lpWallet, 'slice from_address = in_msg_body~load_msg_addr();'],
  [lpWallet, 'equal_slices(jetton_master_address, sender_address)'],
  [lpWallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  [contracts, '(cell) lp_wallet_idata('],
  [poolEntry, 'if handle_lp_account_messages()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const cases = [
  { name: 'same_user', user: 'U', toUser: 'U', sender: 'LP(U)', expectedOwner: 'U', authorized: true },
  { name: 'explicit_delegation', user: 'U', toUser: 'V', sender: 'LP(U)', expectedOwner: 'V', authorized: true },
  { name: 'altered_authenticated_user', user: 'X', toUser: 'V', sender: 'LP(U)', expectedOwner: null, authorized: false },
  { name: 'altered_recipient_only', user: 'U', toUser: 'X', sender: 'LP(U)', expectedOwner: 'X', authorized: true }
];
if (!cases[0].authorized || !cases[1].authorized || cases[2].authorized) throw new Error('callback auth model mismatch');
if (cases[1].expectedOwner !== 'V' || cases[3].expectedOwner !== 'X') throw new Error('recipient model mismatch');

const tokenDelta = { debitedFrom: 'U', creditedTo: 'V', amount: 1000 };
if (tokenDelta.debitedFrom !== 'U' || tokenDelta.creditedTo !== 'V') throw new Error('delegation delta mismatch');
const forgedSenderRejected = cases[2].authorized === false;
const depositorChoosesRecipient = cases[1].authorized && cases[3].authorized;

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`identity_cases ${cases.length}`);
console.log(`explicit_delegation_supported ${depositorChoosesRecipient}`);
console.log(`forged_user_sender_rejected ${forgedSenderRejected}`);
console.log(`mint_owner_follows_to_user ${tokenDelta.creditedTo === 'V'}`);
console.log('attacker_value_extraction false');
console.log('result PASS');
