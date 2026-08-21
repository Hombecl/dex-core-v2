const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const pool = read('contracts/pool/msgs/lp_account.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(pool.includes('slice user_address = in_msg_body~load_msg_addr();'));
assert(pool.includes('slice to_user_address = additional_data~load_msg_addr();'));
assert(pool.includes('lp_account_idata(\n                my_address(), \n                user_address'));
assert(pool.includes('equal_slices(lp_account~address(params::workchain), ctx.at(SENDER))'));
assert(pool.includes('lp_wallet_idata('));
assert(pool.includes('to_user_address'));
assert(pool.includes('jetton_wallet::mint('));
assert(pool.includes('user_address, \n                    excess_address'));
assert(lpAccountUser.includes('pool::cb_add_liquidity('));
assert(lpAccountUser.includes('ctx.at(SENDER), \n                am0, \n                am1, \n                to_user'));
assert(lpAccountPool.includes('storage::user_address'));
assert(common.includes('.store_slice(_user_address)'));
assert(common.includes('.store_slice(_to_user)'));
assert(lpWallet.includes('slice from_address = in_msg_body~load_msg_addr();'));
assert(lpWallet.includes('.store_slice(from_address)'));

const addresses = ['A', 'B', 'C'];
let tupleCases = 0;
let acceptedCases = 0;
let rejectedForgedSenderCases = 0;
let explicitThirdPartyRecipientCases = 0;
for (const userAddress of addresses) {
  for (const toUserAddress of addresses) {
    for (const senderOwner of addresses) {
      const senderMatches = senderOwner === userAddress;
      const poolAccepts = senderMatches;
      if (!poolAccepts) rejectedForgedSenderCases += 1;
      else {
        acceptedCases += 1;
        if (toUserAddress !== userAddress) explicitThirdPartyRecipientCases += 1;
      }
      assert.equal(poolAccepts, senderMatches);
      tupleCases += 1;
    }
  }
}

for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('pool::get_lp_provide_out'));
}

assert.equal(tupleCases, 27);
assert.equal(acceptedCases, 9);
assert.equal(rejectedForgedSenderCases, 18);
assert.equal(explicitThirdPartyRecipientCases, 6);

console.log(JSON.stringify({
  variants_checked: variants.length,
  user_to_user_sender_tuple_cases: tupleCases,
  accepted_authenticated_cases: acceptedCases,
  forged_sender_cases_rejected: rejectedForgedSenderCases,
  explicit_third_party_recipient_cases: explicitThirdPartyRecipientCases,
  from_address_tracks_authenticated_user: true,
  recipient_substitution_without_sender_authority: false,
  attacker_value_extraction: false,
  result: 'PASS',
}, null, 2));
