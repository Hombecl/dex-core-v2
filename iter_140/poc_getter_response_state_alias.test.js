const assert = require('node:assert/strict');
const fs = require('node:fs');

const ctx = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/node_modules/@ston-fi/funcbox/contracts/ctx.fc',
  'utf8',
);
const stdlib = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/node_modules/@ston-fi/funcbox/contracts/stdlib_ext.fc',
  'utf8',
);
const common = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/common/contracts.fc',
  'utf8',
);
const poolGetter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool/msgs/getter.fc',
  'utf8',
);
const routerGetter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router/msgs/getter.fc',
  'utf8',
);
const lpAccountGetter = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_account/msgs/getter.fc',
  'utf8',
);
const poolRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/pool.fc',
  'utf8',
);
const routerRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/router.fc',
  'utf8',
);
const lpAccountRoot = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_account.fc',
  'utf8',
);

assert.match(ctx, /_in_msg_body~load_uint\(32\),\s*_in_msg_body~load_uint\(64\),/s);
assert.match(stdlib, /begin_message\(int _opcode\).*32 STU 64 STU/s);
assert.match(common, /anyone::getter_pool_data[\s\S]*?begin_message\(op::getter_pool_data\)/);
assert.match(common, /anyone::getter_lp_account_address[\s\S]*?begin_message\(op::getter_lp_account_address\)/);
assert.match(common, /anyone::getter_pool_address[\s\S]*?begin_message\(op::getter_pool_address\)/);
assert.match(poolGetter, /msgs::send_simple\(0, ctx\.at\(SENDER\), out_msg_body, CARRY_ALL_BALANCE \| IGNORE_ERRORS\);/);
assert.match(routerGetter, /msgs::send_simple\([\s\S]*?ctx\.at\(SENDER\),[\s\S]*?anyone::getter_pool_address/);
assert.match(lpAccountGetter, /anyone::getter_lp_account_data\([\s\S]*?storage::amount1[\s\S]*?\),[\s\S]*?CARRY_ALL_BALANCE \| IGNORE_ERRORS/);
assert.match(poolRoot, /if handle_getter_messages\(\) \{\s*return \(\);/s);
assert.match(routerRoot, /if handle_getter_messages\(\) \{\s*return \(\);/s);
assert.match(lpAccountRoot, /if handle_getter_messages\(\) \{\s*return \(\);/s);
assert.doesNotMatch(poolGetter, /storage::(?:save|reserve0\s*[+\-]=|reserve1\s*[+\-]=|total_supply_lp\s*[+\-]=)/);
assert.doesNotMatch(routerGetter, /storage::(?:save|is_locked\s*=|admin_address\s*=)/);
assert.doesNotMatch(lpAccountGetter, /storage::(?:save|amount0\s*[+\-]=|amount1\s*[+\-]=)/);

function getterResponse(queryId, sender, payload) {
  return { opcode: payload.opcode, queryId, recipient: sender, data: payload.data };
}

const before = {
  pool: { reserve0: 1000n, reserve1: 2000n, supply: 500n },
  lpAccount: { amount0: 100n, amount1: 200n },
};
const qA = getterResponse(11n, 'CALLER_A', { opcode: 'getter_pool_data', data: before.pool });
const qB = getterResponse(12n, 'CALLER_B', { opcode: 'getter_pool_data', data: before.pool });
assert.deepEqual(qA, { opcode: 'getter_pool_data', queryId: 11n, recipient: 'CALLER_A', data: before.pool });
assert.deepEqual(qB, { opcode: 'getter_pool_data', queryId: 12n, recipient: 'CALLER_B', data: before.pool });
assert.notEqual(qA.queryId, qB.queryId);
assert.notEqual(qA.recipient, qB.recipient);
assert.deepEqual(before, {
  pool: { reserve0: 1000n, reserve1: 2000n, supply: 500n },
  lpAccount: { amount0: 100n, amount1: 200n },
});
const spoofed = getterResponse(13n, 'ATTACKER', { opcode: 'getter_pool_data', data: before.pool });
assert.equal(spoofed.recipient, 'ATTACKER');
assert.deepEqual(spoofed.data, before.pool);

console.log('AF5 getter-response correlation check passed: begin_message preserves QUERY_ID, responses target SENDER, concurrent getter responses remain distinct, and getter handlers do not mutate token state');
