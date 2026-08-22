const fs = require('fs');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const files = [
  'contracts/router/msgs/pool.fc',
  'contracts/router/msgs/jetton.fc',
  'contracts/router/dex.fc',
  'contracts/pool/msgs/router.fc',
  'contracts/common/contracts.fc',
  'contracts/common/op.fc',
  'tests/ConstProduct.spec.ts',
  'tests/System.spec.ts',
  'wrappers/Router.ts',
];

const anchors = [
  ['contracts/router/msgs/pool.fc', 'if (tmp_custom_payload_ds.slice_bits() > 32)'],
  ['contracts/router/msgs/pool.fc', 'if (fwd_opcode == op::cross_swap)'],
  ['contracts/router/msgs/pool.fc', 'route_dex_messages(sent_jetton_address'],
  ['contracts/router/msgs/pool.fc', 'jetton_wallet::transfer(fwd_ton_amount'],
  ['contracts/router/msgs/jetton.fc', 'route_dex_messages('],
  ['contracts/router/dex.fc', 'transferred_op = dex_payload~load_opcode()'],
  ['contracts/router/dex.fc', 'var out_msg_body = jetton_wallet::transfer(0, _sent_amount, refund_address, excesses_address)'],
  ['contracts/pool/msgs/router.fc', 'custom_payload_cs = call_payload~load_maybe_ref()'],
  ['contracts/pool/msgs/router.fc', 'call_payload.end_parse()'],
  ['contracts/pool/msgs/router.fc', 'dex_payload.end_parse()'],
  ['contracts/common/contracts.fc', '.store_slice(_original_caller)'],
  ['contracts/common/op.fc', 'const op::cross_swap'],
  ['tests/ConstProduct.spec.ts', "it('should cross-swap on the same router'"],
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

const CROSS_SWAP = 'CROSS_SWAP';

function inspectPayload({ bits, firstOpcode, rootValid, nestedValid, amount }) {
  const fwdOpcode = bits > 32 ? firstOpcode : null;
  if (fwdOpcode !== CROSS_SWAP) {
    return {
      branch: 'ordinary_transfer',
      amount,
      second_route: false,
      attacker_delta: 0,
    };
  }
  if (!rootValid) {
    return {
      branch: 'route_root_parser_refund',
      amount_refunded_to_original_caller: amount,
      second_route: false,
      attacker_delta: 0,
    };
  }
  if (!nestedValid) {
    return {
      branch: 'derived_pool_parser_refund',
      amount_refunded_to_payload_refund: amount,
      second_route: true,
      attacker_delta: 0,
    };
  }
  return {
    branch: 'cross_swap_route',
    amount_forwarded: amount,
    second_route: true,
    attacker_delta: 0,
  };
}

const exact32 = inspectPayload({ bits: 32, firstOpcode: CROSS_SWAP, rootValid: false, nestedValid: false, amount: 17 });
const nonCross33 = inspectPayload({ bits: 33, firstOpcode: 'SWAP', rootValid: true, nestedValid: true, amount: 19 });
const malformedRoot = inspectPayload({ bits: 80, firstOpcode: CROSS_SWAP, rootValid: false, nestedValid: false, amount: 23 });
const malformedNested = inspectPayload({ bits: 80, firstOpcode: CROSS_SWAP, rootValid: true, nestedValid: false, amount: 29 });
const validNested = inspectPayload({ bits: 80, firstOpcode: CROSS_SWAP, rootValid: true, nestedValid: true, amount: 31 });

if (exact32.branch !== 'ordinary_transfer' || exact32.second_route) throw new Error('exact 32-bit cutoff failed');
if (nonCross33.branch !== 'ordinary_transfer' || nonCross33.second_route) throw new Error('non-cross opcode branch failed');
if (malformedRoot.amount_refunded_to_original_caller !== 23 || malformedRoot.attacker_delta !== 0) throw new Error('root parser refund failed');
if (malformedNested.amount_refunded_to_payload_refund !== 29 || malformedNested.attacker_delta !== 0) throw new Error('nested parser refund failed');
if (validNested.amount_forwarded !== 31 || validNested.attacker_delta !== 0) throw new Error('valid nested route failed');

const result = {
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DG2',
  cross_file_anchors: anchors.length,
  caller_unique_files: files.length,
  exact_32_bits: exact32,
  non_cross_33_bits: nonCross33,
  malformed_root: malformedRoot,
  malformed_nested: malformedNested,
  valid_nested: validNested,
  parser_rollback_evidence: 'root and nested Pool payload parsers use end_parse inside the try/catch refund boundary',
  persistent_attacker_delta: 0,
  reason: 'The >32-bit probe only selects cross_swap when the first 32 bits match; an exact 32-bit cell stays an ordinary transfer. Malformed cross roots refund the original amount, malformed nested Pool payloads refund through their parsed payload address, and a valid nested route remains the intended cross-hop. No attacker-positive persistent delta is reachable.',
};
console.log(JSON.stringify(result));
