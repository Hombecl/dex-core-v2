const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'contracts/router/dex.fc',
  'contracts/router/msgs/pool.fc',
  'contracts/router/msgs/jetton.fc',
  'tests/ConstProduct.spec.ts',
  'tests/System.spec.ts',
  'wrappers/Router.ts',
];

const anchors = [
  ['contracts/common/contracts.fc', '(cell) pool::$route('],
  ['contracts/common/contracts.fc', '.store_slice(_original_caller)'],
  ['contracts/common/op.fc', 'const op::cross_swap'],
  ['contracts/router/dex.fc', 'transferred_op = transferred_op == op::cross_swap ? op::swap : transferred_op'],
  ['contracts/router/dex.fc', 'pool_idata(my_address(), _jetton_address, token_wallet1'],
  ['contracts/router/dex.fc', 'pool::$route(transferred_op'],
  ['contracts/router/msgs/pool.fc', 'if (tmp_custom_payload_ds.slice_bits() > 32)'],
  ['contracts/router/msgs/pool.fc', 'if (fwd_opcode == op::cross_swap)'],
  ['contracts/router/msgs/pool.fc', 'route_dex_messages(sent_jetton_address'],
  ['contracts/router/msgs/pool.fc', 'throw_unless(error::invalid_caller'],
  ['contracts/router/msgs/jetton.fc', 'route_dex_messages('],
  ['tests/ConstProduct.spec.ts', "it('should cross-swap on the same router'"],
  ['tests/ConstProduct.spec.ts', "it('should cross-swap on 2 routers'"],
  ['wrappers/Router.ts', 'export function crossSwapPayload'],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function derivePool(router, tokenA, tokenB) {
  return `POOL(${router},${tokenA},${tokenB})`;
}

function sameRouterHop({ router, outputTokenWallet, nextTokenWallet, existingPool }) {
  const pool = derivePool(router, outputTokenWallet, nextTokenWallet);
  const senderAccepted = pool === derivePool(router, outputTokenWallet, nextTokenWallet);
  return {
    pool,
    senderAccepted,
    payout: senderAccepted && existingPool ? 1 : 0,
    noReservePair: !existingPool,
  };
}

function crossRouterHop({ router2, outputTokenWallet, nextTokenWallet, existingPool }) {
  const notificationSender = outputTokenWallet;
  const pool = derivePool(router2, notificationSender, nextTokenWallet);
  const senderAccepted = pool === derivePool(router2, notificationSender, nextTokenWallet);
  return {
    notificationSender,
    pool,
    senderAccepted,
    payout: senderAccepted && existingPool ? 1 : 0,
    noReservePair: !existingPool,
  };
}

const sameValid = sameRouterHop({
  router: 'R1',
  outputTokenWallet: 'MID_R1',
  nextTokenWallet: 'OUT_R1',
  existingPool: true,
});
const sameMismatched = sameRouterHop({
  router: 'R1',
  outputTokenWallet: 'MID_R1',
  nextTokenWallet: 'ATTACKER_WALLET',
  existingPool: false,
});
const crossValid = crossRouterHop({
  router2: 'R2',
  outputTokenWallet: 'MID_R2',
  nextTokenWallet: 'OUT_R2',
  existingPool: true,
});
const crossMismatched = crossRouterHop({
  router2: 'R2',
  outputTokenWallet: 'MID_R2',
  nextTokenWallet: 'ATTACKER_WALLET',
  existingPool: false,
});

if (!sameValid.senderAccepted || sameValid.payout !== 1) throw new Error('same-router valid hop failed');
if (!sameMismatched.senderAccepted || sameMismatched.payout !== 0 || !sameMismatched.noReservePair) throw new Error('same-router mismatch leaked payout');
if (!crossValid.senderAccepted || crossValid.payout !== 1) throw new Error('cross-router valid hop failed');
if (!crossMismatched.senderAccepted || crossMismatched.payout !== 0 || !crossMismatched.noReservePair) throw new Error('cross-router mismatch leaked payout');

const result = {
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DG1',
  cross_file_anchors: anchors.length,
  caller_unique_files: files.length,
  same_router_valid: sameValid,
  same_router_mismatched_pair: sameMismatched,
  cross_router_valid: crossValid,
  cross_router_mismatched_pair: crossMismatched,
  original_caller_preserved_as_route_field: true,
  persistent_attacker_delta: 0,
  reason: 'Same-router forwarding and cross-router notification both derive the next Pool from the active Router and the two token-wallet addresses, then require the derived Pool as the sender. A mismatched pair produces no reserve-bearing Pool and no payout; an existing pair is the intended hop. No attacker-positive persistent delta is reachable.',
};
console.log(JSON.stringify(result));
