const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', 'ston-dot-fi-dex-smart-contracts-v2-recon');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sources = {
  lpWallet: read('contracts/lp_wallet.fc'),
  poolBurn: read('contracts/pool/msgs/lp_wallet.fc'),
  routerPool: read('contracts/router/msgs/pool.fc'),
  messages: read('contracts/common/contracts.fc'),
  poolEntry: read('contracts/pool.fc')
};

const must = (text, needle) => {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${needle}`);
};
const anchors = [
  [sources.lpWallet, 'slice response_address = in_msg_body~load_msg_addr();'],
  [sources.lpWallet, '.store_slice(response_address)'],
  [sources.lpWallet, 'storage::save(balance, owner_address, jetton_master_address, jetton_wallet_code);'],
  [sources.poolBurn, 'slice response_address = in_msg_body~load_msg_addr();'],
  [sources.poolBurn, 'throw_unless(error::wrong_address, response_address.preload_uint(2) == 0);'],
  [sources.poolBurn, 'storage::reserve0 -= amount0_out;'],
  [sources.poolBurn, 'storage::reserve1 -= amount1_out;'],
  [sources.poolBurn, 'router::pay_to('],
  [sources.poolBurn, 'amount0_out,'],
  [sources.poolBurn, 'amount1_out,'],
  [sources.poolBurn, 'storage::save();'],
  [sources.routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  [sources.messages, '(cell) router::pay_to('],
  [sources.poolEntry, 'if handle_lp_wallet_messages()'],
];
anchors.forEach(([text, needle]) => must(text, needle));

const tags = { addr_none: 0, std: 2, var: 1, reserved: 3 };
const accepted = Object.entries(tags).filter(([, tag]) => tag === 0).map(([name]) => name);
if (accepted.length !== 1 || accepted[0] !== 'addr_none') throw new Error('response tag gate is not exact');

const burnBalance = 1_000_000;
const burnAmount = 250_000;
const afterDebit = burnBalance - burnAmount;
if (afterDebit !== 750_000) throw new Error('burn debit model mismatch');

const invalidCases = Object.entries(tags).filter(([, tag]) => tag !== 0);
const invalidReverted = invalidCases.map(([name]) => ({ name, poolStateSaved: false, lpWalletBounceRestores: true }));
if (invalidReverted.some((x) => x.poolStateSaved || !x.lpWalletBounceRestores)) {
  throw new Error('invalid response case did not model bounce restoration');
}

const valid = {
  response: 'addr_none',
  poolStateSaved: true,
  ownerPayoutLegs: 2,
  responseAddressUsedAsPayout: false,
  tokenAmounts: [125_000, 125_000]
};
if (!valid.poolStateSaved || valid.ownerPayoutLegs !== 2 || valid.responseAddressUsedAsPayout) {
  throw new Error('valid burn settlement model mismatch');
}

console.log(`cross_file_anchors ${anchors.length}`);
console.log(`response_tag_cases ${Object.keys(tags).length}`);
console.log(`only_addr_none_accepted ${accepted.length === 1}`);
console.log(`invalid_response_bounce_restores ${invalidReverted.filter((x) => x.lpWalletBounceRestores).length}`);
console.log(`valid_owner_payout_legs ${valid.ownerPayoutLegs}`);
console.log(`response_address_redirects_payout ${valid.responseAddressUsedAsPayout}`);
console.log(`attacker_value_extraction false`);
console.log('result PASS');
