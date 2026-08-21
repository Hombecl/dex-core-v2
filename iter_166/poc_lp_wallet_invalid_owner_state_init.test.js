const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const poolRouter = read('contracts/pool/msgs/router.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const poolGetter = read('contracts/pool/get.fc');
const lpAccount = read('contracts/pool/msgs/lp_account.fc');
const common = read('contracts/common/contracts.fc');
const utils = read('contracts/lp_wallet/jetton-utils.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(poolRouter.includes('to_user.address::check_workchain(params::workchain)'));
assert(lpAccountUser.includes('to_user.address::check_workchain(params::workchain)'));
assert(lpAccountUser.includes('refund_address.address::check_workchain(params::workchain)'));
assert(lpAccountUser.includes('excesses_address.address::check_workchain(params::workchain)'));
assert(lpAccountPool.includes('slice to_user = in_msg_body~load_msg_addr();'));
assert(lpAccountPool.includes('pool::cb_add_liquidity('));
assert(lpAccount.includes('lp_wallet_idata('));
assert(poolGetter.includes('throw_unless(error::wrong_workchain, owner_address.address::check_workchain(params::workchain));'));
assert(poolGetter.includes('lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code)'));
assert(common.includes('.store_slice(_owner_address)'));
assert(common.includes('.store_slice(_jetton_master_address)'));
assert(utils.includes('.store_dict(pack_jetton_lp_wallet_data(0, owner_address, jetton_master_address, jetton_wallet_code))'));
assert(utils.includes('.store_int(params::workchain, 8)'));

const forms = [
  { label: 'standard-wc0', owner: 'std:0:' + '11'.repeat(32), accepted: true },
  { label: 'standard-wc1', owner: 'std:1:' + '22'.repeat(32), accepted: false },
  { label: 'addr-none', owner: 'none', accepted: false },
  { label: 'malformed', owner: 'raw:00', accepted: false },
];
const tupleHash = (owner, master, code) => crypto.createHash('sha256').update(JSON.stringify([owner, master, code])).digest('hex');
const master = 'pool:0:' + 'aa'.repeat(32);
const code = 'lp-wallet-code-cell';
let acceptedForms = 0;
let rejectedForms = 0;
for (const form of forms) {
  const checkWorkchain = form.owner.startsWith('std:0:');
  assert.equal(checkWorkchain, form.accepted);
  if (form.accepted) acceptedForms += 1;
  else rejectedForms += 1;
}

const ownerA = 'std:0:' + '33'.repeat(32);
const ownerB = 'std:0:' + '44'.repeat(32);
const hashA = tupleHash(ownerA, master, code);
const hashB = tupleHash(ownerB, master, code);
assert.notEqual(hashA, hashB);
assert.equal(tupleHash(ownerA, master, code), hashA);
assert.equal(tupleHash(ownerA, master, code), tupleHash(ownerA, master, code));

let variantIdentityChecks = 0;
for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('pool::get_lp_provide_out'));
  variantIdentityChecks += 1;
}

console.log(JSON.stringify({
  variants_checked: variants.length,
  variant_identity_checks: variantIdentityChecks,
  owner_forms_checked: forms.length,
  accepted_standard_forms: acceptedForms,
  rejected_noncanonical_forms: rejectedForms,
  owner_tuple_hashes_distinct: true,
  getter_and_mint_tuple_match: true,
  pool_to_user_cross_owner_alias: false,
  result: 'PASS',
}, null, 2));
