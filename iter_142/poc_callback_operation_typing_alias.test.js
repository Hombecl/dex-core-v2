const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (relative) => fs.readFileSync(path.join(SOURCE, relative), 'utf8');

const edges = [
  ['cb_add_liquidity', 'cb_add_liquidity', 'contracts/common/contracts.fc', 'contracts/pool/msgs/lp_account.fc'],
  ['cb_refund_me', 'cb_refund_me', 'contracts/common/contracts.fc', 'contracts/pool/msgs/lp_account.fc'],
  ['pay_to', 'pay_to', 'contracts/common/contracts.fc', 'contracts/router/msgs/pool.fc'],
  ['pay_vault', 'pay_vault', 'contracts/common/contracts.fc', 'contracts/router/msgs/pool.fc'],
  ['vault_pay_to', 'vault_pay_to', 'contracts/common/contracts.fc', 'contracts/router/msgs/vault.fc'],
  ['deposit_ref_fee', 'deposit_ref_fee', 'contracts/common/contracts.fc', 'contracts/vault.fc'],
  ['add_liquidity', 'add_liquidity', 'contracts/common/contracts.fc', 'contracts/lp_account/msgs/pool.fc'],
  ['internal_transfer', 'internal_transfer', 'contracts/common/contracts.fc', 'contracts/lp_wallet.fc'],
  ['burn_notification_ext', 'burn_notification_ext', 'contracts/lp_wallet.fc', 'contracts/pool/msgs/lp_wallet.fc'],
  ['transfer_notification', 'ft::transfer_notification', 'contracts/lp_wallet.fc', 'contracts/router/msgs/jetton.fc'],
];

for (const [producerOp, consumerOp, producerFile, consumerFile] of edges) {
  const producer = read(producerFile);
  const consumer = read(consumerFile);
  assert(
    producer.includes(`op::${producerOp}`),
    `${producerOp}: producer ${producerFile} does not encode the declared operation`,
  );
  assert(
    consumer.includes(`op::${consumerOp}`),
    `${producerOp}: consumer ${consumerFile} does not dispatch the declared operation`,
  );
}

const selected = ['contracts/lp_account.fc', 'contracts/lp_wallet.fc', 'contracts/pool.fc', 'contracts/router.fc', 'contracts/vault.fc'];
for (const relative of selected) assert(read(relative).length > 0, `${relative} is empty`);

const operationNames = edges.map(([producerOp]) => producerOp);
assert.equal(new Set(operationNames).size, operationNames.length, 'callback edge inventory contains an ambiguous operation key');
console.log(JSON.stringify({
  edge_count: edges.length,
  operations: operationNames,
  selected_asset_count: selected.length,
  wrong_producer_consumer_pairs: 0,
  result: 'PASS',
}, null, 2));
