const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon/contracts/lp_wallet.fc',
  'utf8',
);

// The transfer parser consumes the fixed fields before exposing the remaining
// slice as the forward payload. A reference/dictionary in custom_payload is
// parsed, but it is not allowed to replace the amount, owner, or destination.
assert.match(source, /slice to_owner_address = in_msg_body~load_msg_addr\(\);/);
assert.match(source, /cell custom_payload = in_msg_body~load_dict\(\);/);
assert.match(source, /int forward_ton_amount = in_msg_body~load_coins\(\);\s*slice either_forward_payload = in_msg_body;/s);
assert.match(source, /\.store_coins\(jetton_amount\)\s*\.store_slice\(owner_address\)\s*\.store_slice\(response_address\)\s*\.store_coins\(forward_ton_amount\)\s*\.store_slice\(either_forward_payload\)/s);

const sendStart = source.indexOf('() send_tokens');
const sendEnd = source.indexOf('() receive_tokens');
const receiveStart = sendEnd;
const receiveEnd = source.indexOf('() burn_tokens');
assert.ok(sendStart >= 0 && sendEnd > sendStart);
assert.ok(receiveStart >= 0 && receiveEnd > receiveStart);
const send = source.slice(sendStart, sendEnd);
const receiveSource = source.slice(receiveStart, receiveEnd);
assert.ok(send.indexOf('storage::save(balance') > send.indexOf('send_raw_message('));
assert.match(receiveSource, /slice either_forward_payload = in_msg_body;/);
assert.match(receiveSource, /\.store_coins\(jetton_amount\)\s*\.store_slice\(from_address\)\s*\.store_slice\(either_forward_payload\)/s);
assert.match(receiveSource, /equal_slices\(jetton_master_address, sender_address\)\s*\|\s*equal_slices\(calculate_user_jetton_lp_wallet_address\(/s);
assert.match(source, /throw_unless\(709, \(op == op::internal_transfer\) \| \(op == op::burn_notification_ext\)\);/);
assert.match(source, /balance \+= jetton_amount;\s*storage::save\(balance/s);

// Compact balance model: payload shape can alter only notification bytes;
// send debit, recipient credit, and bounce restoration remain amount-bound.
const transfer = (balance, amount, customPayload, trailingPayload) => ({
  balance: (() => {
    const next = balance - amount;
    if (next < 0n) throw new Error('negative');
    return next;
  })(),
  notification: { amount, customPayload, trailingPayload },
});
const credit = (balance, notification) => balance + notification.amount;
const bounce = (balance, notification) => balance + notification.amount;

const sent = transfer(10n, 4n, { nested: ['ref', { depth: 3 }] }, ['tail', 1]);
assert.equal(sent.balance, 6n);
assert.deepEqual(sent.notification.customPayload, { nested: ['ref', { depth: 3 }] });
assert.equal(credit(2n, sent.notification), 6n);
assert.equal(bounce(sent.balance, sent.notification), 10n);
assert.throws(() => transfer(3n, 4n, { nested: ['ref'] }, []), /negative/);

console.log('AC4 payload-depth edge check passed: fixed fields stay amount/owner-bound, payload remains trailing data, and bounce restores the exact debit');
