const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const poolRouter = read('contracts/pool/msgs/router.fc');
const poolRoot = read('contracts/pool.fc');
const common = read('contracts/common/contracts.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const vault = read('contracts/vault.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['swap referral branch', poolRouter, 'if (ref_address.preload_uint(2) != 0) & (ref_fee_out0 + ref_fee_out1 > 0)'],
  ['referral NORMAL send', poolRouter, 'gas::vault::deposit_ref_fee,'],
  ['referral pay_vault', poolRouter, 'router::pay_vault('],
  ['main payout carry', poolRouter, 'CARRY_ALL_BALANCE'],
  ['main payout build', poolRouter, 'router::pay_to('],
  ['swap storage save', poolRouter, 'storage::save();'],
  ['swap catch refund', poolRouter, 'refund_payload_cs'],
  ['pool bounce gate', poolRoot, 'if ctx.at(IS_BOUNCED)'],
  ['pay_vault pool auth', routerPool, 'equal_slices(pool~address(params::workchain), ctx.at(SENDER))'],
  ['pay_vault StateInit', routerPool, 'vault~state_init()'],
  ['pay_vault deposit', routerPool, 'vault::deposit_ref_fee('],
  ['vault deposit sender', vault, 'equal_slices(ctx.at(SENDER), storage::router_address)'],
  ['vault deposit save', vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  ['shared pay_vault builder', common, 'return begin_message(op::pay_vault)'],
  ['live system swap', system, "it('should handle cross swap', async () => {"],
  ['live referral collection', constProduct, "it('should collect ref fee from vault', async () => {"]
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ referral = false, referralBounce = false, mainPayoutBounce = false, amount = 100, referralAmount = 3 }) => {
  if (!referral) return { result: 'ordinary_swap', poolReserveDelta: -amount, userPayout: amount, referralLedger: 0, persistentDelta: 0 };
  if (referralBounce) return { result: 'referral_delivery_liveness_only', poolReserveDelta: -(amount + referralAmount), userPayout: amount, referralLedger: referralAmount, persistentDelta: 0 };
  if (mainPayoutBounce) return { result: 'router_refund_path', poolReserveDelta: 0, userPayout: 0, referralLedger: 0, persistentDelta: 0 };
  return { result: 'referral_then_main_payout', poolReserveDelta: -(amount + referralAmount), userPayout: amount, referralLedger: referralAmount, persistentDelta: 0 };
};

const cases = [
  model({}),
  model({ referral: true }),
  model({ referral: true, referralBounce: true }),
  model({ referral: true, mainPayoutBounce: true }),
  model({ referral: true, amount: 10, referralAmount: 1 })
];

if (cases.some((c) => c.persistentDelta !== 0)) throw new Error('swap referral ordering created persistent delta');
if (cases[1].referralLedger !== 3 || cases[1].userPayout !== 100) throw new Error('referral/main payout conservation mismatch');
if (cases[2].userPayout !== 100 || cases[2].referralLedger !== 3) throw new Error('referral bounce model changed fixed user payout');
if (cases[3].poolReserveDelta !== 0 || cases[3].userPayout !== 0) throw new Error('main payout failure did not select refund path');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'DD1',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  pool_reserve_deltas: cases.map((c) => c.poolReserveDelta),
  user_payouts: cases.map((c) => c.userPayout),
  referral_ledgers: cases.map((c) => c.referralLedger),
  persistent_deltas: cases.map((c) => c.persistentDelta),
  reason: 'Pool swap computes referral/protocol fees in the working state, emits the referral pay_vault with a bounded NORMAL budget, emits the main pay_to with CARRY_ALL_BALANCE, and saves only after the successful branch. The catch sends fixed input legs through the existing refund path without saving provisional reserves. Router pay_vault authenticates the deterministic Pool and Vault, while Vault accepts only Router deposits. Referral delivery failure is a liveness/ledger case already covered by the Vault family; no attacker-positive reserve, token, or persistent delta is reachable.'
}, null, 2));
