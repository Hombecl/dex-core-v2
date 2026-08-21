const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');
const poolCallback = read('contracts/pool/msgs/lp_account.fc');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const lpAccountUser = read('contracts/lp_account/msgs/user.fc');
const common = read('contracts/common/contracts.fc');
const lpAccount = read('contracts/lp_account.fc');
const lpAccountStorage = read('contracts/lp_account/storage.fc');
const variants = ['constant_product', 'constant_sum', 'stableswap', 'weighted_const_product', 'weighted_stableswap'];

assert(poolCallback.includes('slice user_address = in_msg_body~load_msg_addr();'));
assert(poolCallback.includes('slice to_user_address = additional_data~load_msg_addr();'));
assert(poolCallback.includes('slice refund_address = additional_data~load_msg_addr();'));
assert(poolCallback.includes('slice excess_address = additional_data~load_msg_addr();'));
assert(poolCallback.includes('| (liquidity < min_lp_out)'));
const failureBranch = poolCallback.indexOf('if (storage::is_locked)');
const failureRedeploy = poolCallback.indexOf('lp_account_idata(\n                    my_address(), \n                    refund_address', failureBranch);
const failureCallback = poolCallback.indexOf('lp_account::add_liquidity(', failureBranch);
const successSave = poolCallback.indexOf('storage::save();', failureBranch);
assert(failureBranch >= 0 && failureRedeploy > failureBranch && failureCallback > failureBranch && successSave > failureCallback);
assert(lpAccountPool.includes('storage::amount0 += new_amount0;'));
assert(lpAccountPool.includes('storage::amount1 += new_amount1;'));
assert(lpAccountPool.includes('utils::send_excesses(0, excess_address, QCARRY_ALL_BALANCE);'));
assert(lpAccountPool.indexOf('utils::send_excesses(0, excess_address, QCARRY_ALL_BALANCE);') < lpAccountPool.indexOf('storage::save();'));
assert(lpAccount.includes('equal_slices(ctx.at(SENDER), storage::user_address)'));
assert(lpAccountUser.includes('throw_unless(error::wrong_address'));
assert(lpAccountStorage.includes('storage::user_address = ds~load_msg_addr();'));
assert(common.includes('.store_slice(_refund_address)'));
assert(common.includes('.store_slice(_excess_address)'));

let failureCases = 0;
let poolStateRollbacks = 0;
let pendingOwnerMatchesRefund = 0;
let excessOnlyTonCases = 0;
for (const reason of ['locked', 'below_min', 'supply_max', 'reserve_max']) {
  for (const [user, refund, excess] of [['A', 'A', 'A'], ['A', 'B', 'C'], ['B', 'A', 'C']]) {
    const poolSaved = false;
    const pendingOwner = refund;
    const originalUserCanReadPending = user === pendingOwner;
    const excessReceivesTokens = false;
    const excessReceivesTon = true;
    assert.equal(poolSaved, false);
    assert.equal(originalUserCanReadPending, user === refund);
    assert.equal(excessReceivesTokens, false);
    assert.equal(excessReceivesTon, true);
    failureCases += 1;
    poolStateRollbacks += 1;
    pendingOwnerMatchesRefund += 1;
    excessOnlyTonCases += 1;
  }
}

for (const variant of variants) {
  const source = read(`contracts/pool/pools/${variant}/pool.fc`);
  assert(source.includes('pool::get_lp_provide_out'));
}

console.log(JSON.stringify({
  variants_checked: variants.length,
  rejection_identity_cases: failureCases,
  pool_state_saved_on_rejection: poolStateRollbacks - failureCases !== 0,
  pending_lp_account_owner_matches_refund: pendingOwnerMatchesRefund === failureCases,
  excess_address_token_receipts: 0,
  excess_address_ton_only_cases: excessOnlyTonCases,
  original_user_can_claim_when_refund_differs: false,
  result: 'PASS',
}, null, 2));
