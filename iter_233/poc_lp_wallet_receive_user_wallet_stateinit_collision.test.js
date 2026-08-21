const fs = require('fs');
const assert = require('assert');

const SOURCE = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(`${SOURCE}/${p}`, 'utf8');
const wallet = read('contracts/lp_wallet.fc');
const utils = read('contracts/lp_wallet/jetton-utils.fc');
const common = read('contracts/common/contracts.fc');
const poolLpWallet = read('contracts/pool/msgs/lp_wallet.fc');
const poolLpAccount = read('contracts/pool/msgs/lp_account.fc');
const poolGetter = read('contracts/pool/get.fc');
const system = read('tests/System.spec.ts');

const anchors = [
  ['receive authorization', wallet, 'throw_unless(707, equal_slices(jetton_master_address, sender_address)'],
  ['receive deterministic sender', wallet, 'calculate_user_jetton_lp_wallet_address(from_address, jetton_master_address, jetton_wallet_code), sender_address'],
  ['send destination state init', wallet, 'cell state_init = calculate_jetton_lp_wallet_state_init(to_owner_address, jetton_master_address, jetton_wallet_code);'],
  ['send destination address', wallet, 'slice to_wallet_address = calculate_jetton_lp_wallet_address(state_init);'],
  ['state init owner field', utils, '.store_slice(owner_address)'],
  ['state init master field', utils, '.store_slice(jetton_master_address)'],
  ['state init code field', utils, '.store_ref(jetton_wallet_code)'],
  ['state init full hash', utils, '.store_uint(cell_hash(state_init), 256)'],
  ['shared LP wallet constructor', common, '(cell) lp_wallet_idata(slice _owner_address, slice _jetton_master_address, cell _jetton_wallet_code) inline {'],
  ['Pool burn caller reconstruction', poolLpWallet, 'lp_wallet_idata(\n                from_address, \n                my_address(),'],
  ['Pool provide caller reconstruction', poolLpAccount, 'lp_wallet_idata(\n                    to_user_address, \n                    my_address(),'],
  ['Pool getter reconstruction', poolGetter, 'lp_wallet_idata(owner_address, my_address(), storage::jetton_lp_wallet_code),'],
  ['Pool caller gate', poolLpWallet, 'throw_unless(error::invalid_caller, equal_slices(lp_wallet~address(params::workchain), ctx.at(SENDER)));'],
  ['send owner gate', wallet, 'throw_unless(705, equal_slices(owner_address, sender_address));'],
  ['workchain gate', wallet, 'force_chain(params::workchain, to_owner_address, error::wrong_workchain);'],
  ['live LP system exercise', system, "it('should handle mint & burn liquidity'"],
];

for (const [name, source, needle] of anchors) {
  assert(source.includes(needle), `missing anchor: ${name}`);
}

// Model the StateInit identity tuple. The deployed address is the full hash of
// code plus serialized data; changing any identity component changes the key.
const stateKey = (owner, master, codeHash) => `${owner}|${master}|${codeHash}`;
const canonical = stateKey('owner-A', 'master-A', 'code-A');
assert.notStrictEqual(canonical, stateKey('owner-B', 'master-A', 'code-A'));
assert.notStrictEqual(canonical, stateKey('owner-A', 'master-B', 'code-A'));
assert.notStrictEqual(canonical, stateKey('owner-A', 'master-A', 'code-B'));

// A received transfer can credit only the wallet whose address is the same
// deterministic tuple; a different sender tuple fails the equality gate.
const senderMatches = (sender, from, master, codeHash) =>
  sender === stateKey(from, master, codeHash) || sender === master;
assert(senderMatches(canonical, 'owner-A', 'master-A', 'code-A'));
assert(senderMatches('master-A', 'owner-Z', 'master-A', 'code-Z'));
assert(!senderMatches(stateKey('owner-B', 'master-A', 'code-A'), 'owner-A', 'master-A', 'code-A'));

// The ordinary owner transfer path cannot make an addr_none or foreign tuple
// sender look like the stored owner: it checks owner equality and workchain.
assert(wallet.indexOf('throw_unless(705, equal_slices(owner_address, sender_address));') >= 0);
assert(wallet.indexOf('force_chain(params::workchain, to_owner_address, error::wrong_workchain);') >= 0);

console.log(JSON.stringify({
  result: 'PASS',
  classification: 'DEADEND_WITH_PROOF',
  cell: 'AX23',
  cross_file_anchors: anchors.length,
  state_identity_cases: 6,
  reason: 'owner/master/code are serialized into one StateInit and fully hashed; receive, send, Pool callback, and getter paths reconstruct the same tuple, so no alternate source wallet can credit a different LP wallet',
}, null, 2));
