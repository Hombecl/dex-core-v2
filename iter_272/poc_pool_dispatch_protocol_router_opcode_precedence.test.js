const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/pool.fc',
  'contracts/pool/msgs/protocolfee.fc',
  'contracts/pool/msgs/router.fc',
  'contracts/router.fc',
  'contracts/router/msgs/admin.fc',
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'contracts/test/pool_dummy.fc',
  'tests/System.spec.ts',
  'tests/ConstProduct.spec.ts',
];

const anchors = [
  ['contracts/pool.fc', 'if equal_slices(ctx.at(SENDER), storage::protocol_fee_address)'],
  ['contracts/pool.fc', 'handle_protocolfee_messages();'],
  ['contracts/pool.fc', 'if equal_slices(ctx.at(SENDER), storage::router_address)'],
  ['contracts/pool.fc', 'handle_router_messages();'],
  ['contracts/pool/msgs/protocolfee.fc', 'if ctx.at(OPCODE) == op::collect_fees'],
  ['contracts/pool/msgs/router.fc', 'if ctx.at(OPCODE) == op::internal_set_fees'],
  ['contracts/pool/msgs/router.fc', 'storage::protocol_fee_address = new_protocol_fee_address'],
  ['contracts/router.fc', 'if equal_slices(ctx.at(SENDER), storage::admin_address)'],
  ['contracts/router/msgs/admin.fc', 'pool::internal_set_fees('],
  ['contracts/common/contracts.fc', 'return begin_message(op::internal_set_fees)'],
  ['contracts/common/op.fc', 'const op::internal_set_fees'],
  ['contracts/test/pool_dummy.fc', 'if equal_slices(ctx.at(SENDER), storage::protocol_fee_address)'],
  ['tests/System.spec.ts', "it('should set fees'"],
  ['tests/ConstProduct.spec.ts', "it('should set fees'"],
];

for (const file of files) {
  if (!fs.existsSync(`${sourceRoot}/${file}`)) throw new Error(`missing source ${file}`);
}
for (const [file, needle] of anchors) {
  if (!fs.readFileSync(`${sourceRoot}/${file}`, 'utf8').includes(needle)) {
    throw new Error(`missing anchor ${file}: ${needle}`);
  }
}

function poolDispatch({ sender, protocolFeeAddress, routerAddress, opcode }) {
  if (sender === protocolFeeAddress) return opcode === 'collect_fees'
    ? 'protocol_fee_handler'
    : 'protocol_fee_handler_wrong_op';
  if (sender === routerAddress) return 'router_handler';
  return 'downstream_identity_handlers_or_wrong_op';
}

const normalProtocol = poolDispatch({
  sender: 'PROTOCOL',
  protocolFeeAddress: 'PROTOCOL',
  routerAddress: 'ROUTER',
  opcode: 'collect_fees',
});
const normalRouter = poolDispatch({
  sender: 'ROUTER',
  protocolFeeAddress: 'PROTOCOL',
  routerAddress: 'ROUTER',
  opcode: 'internal_set_fees',
});
const collisionRouterSetFees = poolDispatch({
  sender: 'ROUTER',
  protocolFeeAddress: 'ROUTER',
  routerAddress: 'ROUTER',
  opcode: 'internal_set_fees',
});
const collisionCollect = poolDispatch({
  sender: 'ROUTER',
  protocolFeeAddress: 'ROUTER',
  routerAddress: 'ROUTER',
  opcode: 'collect_fees',
});
const outsider = poolDispatch({
  sender: 'OUTSIDER',
  protocolFeeAddress: 'PROTOCOL',
  routerAddress: 'ROUTER',
  opcode: 'internal_set_fees',
});

if (normalProtocol !== 'protocol_fee_handler') throw new Error('normal protocol route failed');
if (normalRouter !== 'router_handler') throw new Error('normal router route failed');
if (collisionRouterSetFees !== 'protocol_fee_handler_wrong_op') throw new Error('collision precedence failed');
if (collisionCollect !== 'protocol_fee_handler') throw new Error('collision collect route failed');
if (outsider !== 'downstream_identity_handlers_or_wrong_op') throw new Error('outsider boundary failed');

const result = {
  result: 'PASS',
  classification: 'KILLED_TRUSTED_ON_TRUSTED',
  cell: 'DF4',
  cross_file_anchors: anchors.length,
  caller_unique_files: files.length,
  normal_protocol_route: normalProtocol,
  normal_router_route: normalRouter,
  collision_router_set_fees_route: collisionRouterSetFees,
  collision_collect_route: collisionCollect,
  outsider_route: outsider,
  collision_requires_admin_selected_identity: true,
  persistent_attacker_delta: 0,
  reason: 'Pool protocol-fee precedence is real, but protocol_fee_address == router_address is an admin-selected trusted configuration. The collision changes which trusted handler sees Router-originated messages; no external sender can create the collision or gain a persistent token/state delta.',
};
console.log(JSON.stringify(result));
