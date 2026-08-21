const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const opcodeFiles = ['contracts/common/op.fc', 'contracts/lp_wallet/op.fc'];

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});

function crc32(text) {
  let crc = 0xffffffff;
  for (const byte of Buffer.from(text)) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const rows = [];
for (const relative of opcodeFiles) {
  const file = path.join(SOURCE, relative);
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    let match = line.match(/^const\s+op::(\w+)\s*=\s*"([^"]+)"c/);
    if (match) {
      const raw = crc32(match[2]);
      rows.push({ name: match[1], masked: raw & 0x7fffffff, file: relative });
      continue;
    }
    match = line.match(/^const\s+op::(\w+)\s*=\s*(0x[0-9a-f]+)/);
    if (match) rows.push({ name: match[1], masked: Number.parseInt(match[2], 16), file: relative });
  }
}

assert(rows.length >= 60, `opcode inventory unexpectedly small: ${rows.length}`);
const byValue = new Map();
for (const row of rows) byValue.set(row.masked, [...(byValue.get(row.masked) || []), row]);
const duplicateGroups = [...byValue.values()].filter((group) => group.length > 1);
const unexpected = duplicateGroups.filter((group) => new Set(group.map((row) => row.name)).size !== 1);

assert.deepEqual(unexpected, [], `unexpected opcode collision: ${JSON.stringify(unexpected)}`);
assert.equal(duplicateGroups.length, 1, 'expected only the shared jetton internal_transfer interface alias');
assert.equal(duplicateGroups[0].every((row) => row.name === 'internal_transfer'), true);

const dispatcherFiles = [
  'contracts/router/msgs/jetton.fc',
  'contracts/router/msgs/pool.fc',
  'contracts/pool/msgs/router.fc',
  'contracts/pool/msgs/lp_account.fc',
  'contracts/pool/msgs/lp_wallet.fc',
  'contracts/lp_account/msgs/user.fc',
  'contracts/lp_wallet.fc',
];
for (const relative of dispatcherFiles) {
  const contents = fs.readFileSync(path.join(SOURCE, relative), 'utf8');
  assert(contents.includes('ctx.at(OPCODE)') || contents.includes('in_msg_body~load_uint(32)'), `${relative} has no opcode dispatch anchor`);
}

console.log(JSON.stringify({
  inventory: rows.length,
  distinct_masked_values: byValue.size,
  duplicate_groups: duplicateGroups.map((group) => ({ value: `0x${group[0].masked.toString(16).padStart(8, '0')}`, names: group.map((row) => row.name) })),
  unexpected_collisions: unexpected.length,
  dispatcher_files: dispatcherFiles.length,
  result: 'PASS',
}, null, 2));
