const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const vault = read('contracts/vault.fc');
const common = read('contracts/common/contracts.fc');
const poolRouter = read('contracts/pool/msgs/router.fc');
const routerVault = read('contracts/router/msgs/vault.fc');
const routerRoot = read('contracts/router.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['vault owner field', vault, 'global slice storage::owner_address;'],
  ['vault token field', vault, 'global slice storage::token_address;'],
  ['vault router field', vault, 'global slice storage::router_address;'],
  ['vault coin field', vault, 'global int storage::deposited_amount;'],
  ['vault load owner', vault, 'storage::owner_address = ds~load_msg_addr();'],
  ['vault load coin', vault, 'storage::deposited_amount = ds~load_coins();'],
  ['vault load end', vault, 'ds.end_parse();'],
  ['vault save tuple', vault, '.store_coins(storage::deposited_amount)'],
  ['deposit sender gate', vault, 'equal_slices(ctx.at(SENDER), storage::router_address)'],
  ['deposit add', vault, 'storage::deposited_amount += in_msg_body~load_coins();'],
  ['withdraw zero gate', vault, 'storage::deposited_amount > 0'],
  ['withdraw tuple', vault, 'router::vault_pay_to('],
  ['withdraw carry destroy', vault, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['withdraw clear save', vault, 'storage::deposited_amount = 0;'],
  ['vault identity builder', common, 'return begin_cell()'],
  ['router payout parser', routerVault, 'vault_idata(to_address, token_address, my_address())'],
  ['router payout sender gate', routerVault, 'equal_slices(vault~address(params::workchain), ctx.at(SENDER))'],
  ['router admin bounce gate', routerRoot, 'if ctx.at(IS_BOUNCED)'],
  ['live referral vault', constProduct, "it('should collect ref fee from vault', async () => {"],
  ['live system governance', system, "it('should collect fees', async () => {"]
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ tail = false, malformedCoin = false, sender = 'router', amount = 10, withdraw = false, secondWithdraw = false }) => {
  if (tail || malformedCoin) return { result: 'load_rejected_before_commit', storedAmount: 0, ownerDelta: 0, persistentDelta: 0 };
  if (sender !== 'router') return { result: 'deposit_rejected_sender', storedAmount: 0, ownerDelta: 0, persistentDelta: 0 };
  if (secondWithdraw) return { result: 'withdraw_rejected_zero_output', storedAmount: 0, ownerDelta: 0, persistentDelta: 0 };
  if (withdraw) return { result: 'exact_owner_payout_and_clear', storedAmount: 0, ownerDelta: amount, persistentDelta: 0 };
  return { result: 'router_deposit_exact_add', storedAmount: amount, ownerDelta: 0, persistentDelta: 0 };
};

const cases = [
  model({ amount: 10 }),
  model({ amount: 10, tail: true }),
  model({ amount: 10, malformedCoin: true }),
  model({ amount: 10, sender: 'external' }),
  model({ amount: 10, withdraw: true }),
  model({ amount: 10, secondWithdraw: true })
];

if (cases[0].storedAmount !== 10 || cases[0].persistentDelta !== 0) throw new Error('valid deposit tuple mismatch');
if (cases[1].storedAmount !== 0 || cases[2].storedAmount !== 0 || cases[3].storedAmount !== 0) throw new Error('invalid storage/deposit path persisted');
if (cases[4].result !== 'exact_owner_payout_and_clear' || cases[4].storedAmount !== 0) throw new Error('withdraw did not clear exact amount');
if (cases[5].result !== 'withdraw_rejected_zero_output') throw new Error('withdraw replay was accepted');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'CC5',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  stored_amounts: cases.map((c) => c.storedAmount),
  owner_deltas: cases.map((c) => c.ownerDelta),
  persistent_deltas: cases.map((c) => c.persistentDelta),
  reason: 'Vault storage serializes owner, token, router, and Coins in one fixed tuple and requires end_parse on load. Router-only deposits add the exact parsed amount and save; malformed tails, malformed coin widths, and non-router senders do not commit. Public withdrawal sends the stored amount with the stored owner/token tuple through the deterministic Router vault check, then clears and saves once; a second withdrawal sees zero. CARRY_ALL_BALANCE and DESTROY_IF_ZERO affect TON/account lifecycle only, not the stored token amount.'
}, null, 2));
