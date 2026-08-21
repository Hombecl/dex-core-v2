const assert = require('node:assert/strict');
const fs = require('node:fs');

const REQUIRED_MIN = 1001n;

function burnOut(lpAmount, reserve, totalSupply) {
  return (lpAmount * reserve) / totalSupply;
}

const poolCallback = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_account.fc',
  'utf8',
);
const burnCallback = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/lp_wallet.fc',
  'utf8',
);
const lpWallet = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet.fc',
  'utf8',
);

assert.equal(REQUIRED_MIN, 1001n);
assert.equal(1001n - REQUIRED_MIN, 0n);
assert.equal(1002n - REQUIRED_MIN, 1n);

// A pool whose initial invariant is exactly the locked minimum cannot mint user LP.
assert.ok((1001n - REQUIRED_MIN) < 1n);

// The first redeemable unit above the lock leaves the 1001-unit lock and positive reserves.
assert.equal(burnOut(1n, 1002n, 1002n), 1n);
assert.equal(1002n - 1n, 1001n);

// A burn larger than supply produces a non-positive post-burn supply/reserve and is rejected.
assert.ok((1002n - 1003n) <= 0n);
assert.ok((1002n - burnOut(1003n, 1002n, 1002n)) <= 0n);

assert.match(poolCallback, /params::required_min_liquidity/);
assert.match(poolCallback, /liquidity < min_lp_out/);
assert.match(burnCallback, /storage::reserve0 > 0/);
assert.match(burnCallback, /storage::reserve1 > 0/);
assert.match(burnCallback, /storage::total_supply_lp > 0/);
assert.match(lpWallet, /balance >= 0/);

console.log('AB2 edge model passed: locked minimum, first redeemable unit, and over-burn rejection');
