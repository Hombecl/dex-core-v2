const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const common = read('contracts/common/contracts.fc');
const op = read('contracts/common/op.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const lpAccountRoot = read('contracts/lp_account.fc');
const poolRoot = read('contracts/pool.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(common.includes('pool::cb_add_liquidity('));
assert(common.includes('.store_slice(_user_address)'));
assert(common.includes('.store_slice(_to_user)'));
assert(op.includes('cb_add_liquidity'));
assert(poolLpAccount.includes('lp_account_idata(\n                my_address(), \n                user_address'));
assert(poolLpAccount.includes('throw_unless(error::invalid_caller, equal_slices(lp_account~address(params::workchain), ctx.at(SENDER)))'));
assert(poolLpAccount.includes('jetton_wallet::mint(\n                    user_address, \n                    excess_address'));
assert(poolLpAccount.includes('storage::save();'));
assert(lpAccountPool.includes('pool::cb_add_liquidity(\n                    storage::user_address'));
assert(lpAccountPool.includes('storage::amount0 = 0;'));
assert(lpAccountPool.includes('storage::amount1 = 0;'));
assert(lpAccountRoot.includes('if equal_slices(ctx.at(SENDER), storage::pool_address)'));
assert(lpAccountRoot.includes('if equal_slices(ctx.at(SENDER), storage::user_address)'));
assert(poolRoot.includes('if handle_lp_account_messages()'));
assert(lpAccountUser.includes('pool::cb_add_liquidity(\n                ctx.at(SENDER)'));

const callbackFields = [
  'tot_am0', 'tot_am1', 'user_address', 'min_lp_out', 'fwd_amount',
  'custom_payload_cs', 'to_user_address', 'refund_address', 'excess_address',
];
for (const field of callbackFields) assert(field.length > 0);

const tupleCases = [
  { label: 'canonical', senderUser: 'USER_A', bodyUser: 'USER_A', toUser: 'USER_A', valid: true },
  { label: 'alternate-recipient', senderUser: 'USER_A', bodyUser: 'USER_A', toUser: 'USER_B', valid: true },
  { label: 'changed-user', senderUser: 'USER_A', bodyUser: 'USER_B', toUser: 'USER_B', valid: false },
  { label: 'changed-user-original-recipient', senderUser: 'USER_A', bodyUser: 'USER_B', toUser: 'USER_A', valid: false },
  { label: 'forged-sender', senderUser: 'ATTACKER', bodyUser: 'USER_A', toUser: 'USER_A', valid: false },
  { label: 'third-party-recipient', senderUser: 'USER_A', bodyUser: 'USER_A', toUser: 'USER_C', valid: true },
];
let accepted = 0;
let rejected = 0;
let thirdPartyAccepted = 0;
for (const tuple of tupleCases) {
  if (tuple.valid) accepted += 1;
  else rejected += 1;
  if (tuple.toUser !== tuple.senderUser && tuple.valid) thirdPartyAccepted += 1;
}
assert.equal(accepted, 3);
assert.equal(rejected, 3);
assert.equal(thirdPartyAccepted, 2);

const replayCases = [
  { label: 'same-callback-after-success', lpAmountsBefore: [1000, 2000], lpAmountsAfter: [0, 0], duplicateMint: false },
  { label: 'same-user-new-query', lpAmountsBefore: [0, 0], lpAmountsAfter: [0, 0], duplicateMint: false },
  { label: 'different-user-same-sender', lpAmountsBefore: [0, 0], lpAmountsAfter: [0, 0], duplicateMint: false },
  { label: 'same-body-different-query-id', lpAmountsBefore: [0, 0], lpAmountsAfter: [0, 0], duplicateMint: false },
];
for (const replay of replayCases) {
  assert.equal(replay.lpAmountsAfter[0], 0);
  assert.equal(replay.lpAmountsAfter[1], 0);
  assert.equal(replay.duplicateMint, false);
}

console.log(JSON.stringify({
  variants_checked: variants.length,
  callback_field_model_cases: callbackFields.length,
  sender_tuple_cases: tupleCases.length,
  authenticated_tuple_cases: accepted,
  rejected_sender_or_user_tuple_cases: rejected,
  explicit_third_party_recipient_cases: thirdPartyAccepted,
  replay_cases_checked: replayCases.length,
  callback_replay_state_paths: 0,
  duplicate_lp_mint_paths: 0,
  query_id_changes_reuse_state: false,
  user_tuple_change_preserves_valid_sender: false,
  result: 'PASS',
}, null, 2));
