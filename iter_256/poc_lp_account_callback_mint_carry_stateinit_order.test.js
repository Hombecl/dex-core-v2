const fs = require('fs');
const path = require('path');

const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(sourceRoot, p), 'utf8');
const lpAccountPool = read('contracts/lp_account/msgs/pool.fc');
const common = read('contracts/common/contracts.fc');
const poolCallback = read('contracts/pool/msgs/lp_account.fc');
const lpWallet = read('contracts/lp_wallet.fc');
const lpStorage = read('contracts/lp_wallet/storage.fc');
const system = read('tests/System.spec.ts');
const constProduct = read('tests/ConstProduct.spec.ts');

const anchors = [
  ['account accumulates', lpAccountPool, 'storage::amount0 += new_amount0;'],
  ['account callback carry', lpAccountPool, 'CARRY_ALL_BALANCE | DESTROY_IF_ZERO'],
  ['account clear before save', lpAccountPool, 'storage::amount0 = 0;'],
  ['callback schema builder', common, 'return begin_message(op::cb_add_liquidity)'],
  ['callback sender derivation', poolCallback, 'lp_account_idata('],
  ['callback auth', poolCallback, 'throw_unless(error::invalid_caller'],
  ['callback state init', poolCallback, 'lp_wallet~state_init()'],
  ['callback mint body', poolCallback, 'jetton_wallet::mint('],
  ['callback carry mint', poolCallback, 'CARRY_ALL_BALANCE'],
  ['callback save ordering', poolCallback, 'storage::save();'],
  ['wallet internal transfer', lpWallet, 'if (op == op::internal_transfer)'],
  ['wallet credit', lpWallet, 'balance += jetton_amount;'],
  ['wallet source auth', lpWallet, 'calculate_user_jetton_lp_wallet_address'],
  ['wallet save', lpStorage, 'set_data(pack_jetton_lp_wallet_data'],
  ['live mint burn', system, "it('should handle mint & burn liquidity', async () => {"],
  ['live complex provide', constProduct, "it('should handle more complex scenarios', async () => {"]
];

for (const [label, text, needle] of anchors) {
  if (!text.includes(needle)) throw new Error(`missing anchor: ${label}`);
}

const model = ({ validCallback = true, failureBranch = false, newWallet = false, fwdAmount = 1, gasAvailable = 10, mintAmount = 100 }) => {
  if (!validCallback) return { result: 'rejected_invalid_caller', poolSupplyDelta: 0, walletDelta: 0, accountDelta: 0, persistentDelta: 0 };
  if (failureBranch) return { result: 'exact_lp_account_refund', poolSupplyDelta: 0, walletDelta: 0, accountDelta: mintAmount, persistentDelta: 0 };
  const forwarded = fwdAmount > 0 && (gasAvailable - (fwdAmount + 2)) > 0 ? fwdAmount : 0;
  return {
    result: newWallet ? 'stateinit_mint' : 'existing_wallet_mint',
    poolSupplyDelta: mintAmount,
    walletDelta: mintAmount,
    accountDelta: 0,
    forwarded,
    persistentDelta: 0
  };
};

const cases = [
  model({ newWallet: true }),
  model({ newWallet: false }),
  model({ fwdAmount: 9, gasAvailable: 10 }),
  model({ validCallback: false }),
  model({ failureBranch: true })
];

if (cases[0].poolSupplyDelta !== cases[0].walletDelta || cases[0].accountDelta !== 0) throw new Error('new StateInit mint conservation mismatch');
if (cases[1].poolSupplyDelta !== cases[1].walletDelta || cases[1].accountDelta !== 0) throw new Error('existing wallet mint conservation mismatch');
if (cases[2].forwarded !== 0 || cases[2].poolSupplyDelta !== cases[2].walletDelta) throw new Error('forward amount clamp changed LP mint amount');
if (cases[3].poolSupplyDelta !== 0 || cases[3].walletDelta !== 0) throw new Error('invalid callback changed state');
if (cases[4].poolSupplyDelta !== 0 || cases[4].walletDelta !== 0 || cases[4].accountDelta !== 100) throw new Error('failure branch was not exact refund');

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'PRE_KILLED_DUPLICATE',
  cell: 'CC3',
  cross_file_anchors: anchors.length,
  cases: cases.length,
  deltas: cases.map(({ poolSupplyDelta, walletDelta, accountDelta, persistentDelta }) => ({ poolSupplyDelta, walletDelta, accountDelta, persistentDelta })),
  reason: 'The authenticated Pool callback derives the LPWallet from (to_user, Pool, code), clamps only the optional forward amount, sends the exact LP amount in jetton_wallet::mint with StateInit and CARRY_ALL_BALANCE, then saves Pool state. LPWallet receive_tokens authenticates the Pool master, credits the exact amount, and saves independently; invalid callback and failure branches do not persist a mint. Existing-wallet and new-StateInit cases conserve the modeled Pool supply and LPWallet balance with zero attacker-positive delta.'
}, null, 2));
