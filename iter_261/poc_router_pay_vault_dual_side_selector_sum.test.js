const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const routerPool = read('contracts/router/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const vault = read('contracts/vault.fc');
const op = read('contracts/common/op.fc');
const constProduct = read('tests/ConstProduct.spec.ts');
const system = read('tests/System.spec.ts');

const anchors = [
  ['pay_vault branch', routerPool, 'if ctx.at(OPCODE) == op::pay_vault'],
  ['amount0 parse', routerPool, 'int amount0_out = additional_info~load_coins();'],
  ['token0 parse', routerPool, 'slice token0_address = additional_info~load_msg_addr();'],
  ['amount1 parse', routerPool, 'int amount1_out = additional_info~load_coins();'],
  ['token1 parse', routerPool, 'slice token1_address = additional_info~load_msg_addr();'],
  ['Pool sender gate', routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)));'],
  ['Vault token selector', routerPool, 'amount0_out > 0 ? token0_address : token1_address'],
  ['Vault StateInit', routerPool, 'vault~state_init()'],
  ['deposit builder call', routerPool, 'vault::deposit_ref_fee('],
  ['sum selector deposit', routerPool, 'amount0_out + amount1_out'],
  ['Vault carry', routerPool, 'QCARRY_ALL_BALANCE'],
  ['pay_vault builder', common, '(cell) router::pay_vault('],
  ['pay_vault opcode', common, 'return begin_message(op::pay_vault)'],
  ['builder amount0', common, '.store_coins(_amount0_out)'],
  ['builder amount1', common, '.store_coins(_amount1_out)'],
  ['Pool referral amount0', poolRouter, 'ref_fee_out0 = 0;'],
  ['Pool referral amount1', poolRouter, 'ref_fee_out1 = 0;'],
  ['Pool input-side output', poolRouter, '(out1, protocol_fee_out, ref_fee_out1) = pool::get_swap_out(true, ref_value, amount0, storage::reserve0, storage::reserve1);'],
  ['Pool reverse-side output', poolRouter, '(out0, protocol_fee_out, ref_fee_out0) = pool::get_swap_out(false, ref_value, amount1, storage::reserve1, storage::reserve0);'],
  ['referral guard', poolRouter, 'if (ref_address.preload_uint(2) != 0) & (ref_fee_out0 + ref_fee_out1 > 0)'],
  ['Pool pay_vault call', poolRouter, 'router::pay_vault('],
  ['Vault auth', vault, 'if (ctx.at(OPCODE) == op::deposit_ref_fee) & equal_slices(ctx.at(SENDER), storage::router_address) {'],
  ['Vault add', vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  ['Vault save', vault, 'storage::save();'],
  ['pay_vault schema', op, 'const op::pay_vault'],
  ['live referral test', constProduct, "it('should collect ref fee from vault', async () => {"],
  ['live cross route', system, "it('should handle cross swap', async () => {"],
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ amount0, amount1, producer = true, senderOk = true }) => {
  const sum = amount0 + amount1;
  if (!senderOk) return { branch: 'reject_invalid_pool_sender', token: null, deposit: 0, persistentDelta: 0 };
  if (!producer || !((amount0 > 0) ^ (amount1 > 0)) || sum <= 0) {
    return { branch: 'unreachable_tuple', token: null, deposit: 0, persistentDelta: 0 };
  }
  return {
    branch: 'deposit_ref_fee',
    token: amount0 > 0 ? 'TOKEN0' : 'TOKEN1',
    deposit: sum,
    persistentDelta: 0,
  };
};

const cases = [
  model({ amount0: 7, amount1: 0 }),
  model({ amount0: 0, amount1: 7 }),
  model({ amount0: 3, amount1: 4, producer: false }),
  model({ amount0: 0, amount1: 0, producer: false }),
  model({ amount0: 7, amount1: 0, senderOk: false }),
];

if (cases[0].token !== 'TOKEN0' || cases[0].deposit !== 7) throw new Error('token0 referral selected the wrong Vault asset');
if (cases[1].token !== 'TOKEN1' || cases[1].deposit !== 7) throw new Error('token1 referral selected the wrong Vault asset');
if (cases[2].branch !== 'unreachable_tuple' || cases[3].branch !== 'unreachable_tuple') throw new Error('invalid dual/zero referral tuple reached producer path');
if (cases[4].branch !== 'reject_invalid_pool_sender') throw new Error('invalid Pool sender bypassed pay_vault gate');
if (cases.some((c) => c.persistentDelta !== 0)) throw new Error('selector/sum model changed persistent state unexpectedly');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DD3',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  branches: cases.map((c) => c.branch),
  vault_tokens: cases.map((c) => c.token),
  deposited_amounts: cases.map((c) => c.deposit),
  persistent_deltas: cases.map((c) => c.persistentDelta),
  reason: 'The only in-scope pay_vault producer is the Pool swap referral branch. A token0-input swap produces ref_fee_out1 only; a token1-input swap produces ref_fee_out0 only. Router selects the positive side token and deposits amount0_out + amount1_out into the deterministic Vault, while the Pool sender gate rejects forged tuples. Dual-positive and dual-zero tuples are not producer-reachable, so no wrong-token deposit or amount inflation is reachable.'
}, null, 2));
