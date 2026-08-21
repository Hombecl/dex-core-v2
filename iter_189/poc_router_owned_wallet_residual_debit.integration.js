const sourceRoot = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const { compile } = require(`${sourceRoot}/node_modules/@ton/blueprint`);
const { Blockchain } = require(`${sourceRoot}/node_modules/@ton/sandbox`);
const { toNano } = require(`${sourceRoot}/node_modules/@ton/core`);
const {
  buildLibFromCell,
  buildLibs,
  DEFAULT_JETTON_MINTER_CODE,
  DEFAULT_JETTON_WALLET_CODE,
  JettonMinterContract,
  JettonWalletContract,
  metadataCell,
  onchainMetadata,
  SLIM_CONFIG_LEGACY,
} = require(`${sourceRoot}/libs`);
const { preprocBuildContractsLocal } = require(`${sourceRoot}/helpers/helpers`);
const { Router, provideLpPayload } = require(`${sourceRoot}/wrappers/Router`);
const { Pool } = require(`${sourceRoot}/wrappers/Pool`);
const { LPWallet } = require(`${sourceRoot}/wrappers/LPWallet`);

const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function main() {
  preprocBuildContractsLocal({
    defaultProtocolFee: null,
    defaultIsLocked: null,
    defaultLPFee: null,
    dexType: 'constant_product',
  });

  const raw = {
    router: await compile('Router'),
    lpAccount: await compile('LPAccount'),
    lpWallet: await compile('LPWallet'),
    pool: await compile('Pool'),
    vault: await compile('Vault'),
  };
  const libs = buildLibs(raw);
  const code = {
    router: buildLibFromCell(raw.router, 'build/router.json'),
    lpWallet: buildLibFromCell(raw.lpWallet, 'build/lpWallet.json'),
    lpAccount: buildLibFromCell(raw.lpAccount, 'build/lpAccount.json'),
    pool: buildLibFromCell(raw.pool, 'build/pool.json'),
    vault: buildLibFromCell(raw.vault, 'build/vault.json'),
  };

  const bc = await Blockchain.create({ config: SLIM_CONFIG_LEGACY });
  bc.libs = libs;
  bc.now = Math.floor(Date.now() / 1000);
  const admin = await bc.treasury('admin');
  const attacker = await bc.treasury('attacker');
  const fakeWalletA = await bc.treasury('attacker-forged-token-wallet');
  const donor = await bc.treasury('token-holder');

  const router = bc.openContract(Router.createFromConfig({
    id: 0,
    isLocked: false,
    adminAddress: admin.address,
    lpAccountCode: code.lpAccount,
    lpWalletCode: code.lpWallet,
    poolCode: code.pool,
    vaultCode: code.vault,
  }, code.router));
  await router.sendDeploy(admin.getSender(), toNano('5'));

  const minter = bc.openContract(JettonMinterContract.createFromConfig({
    totalSupply: 0,
    adminAddress: admin.address,
    content: metadataCell(onchainMetadata({ name: 'residual-test-token' })),
    jettonWalletCode: DEFAULT_JETTON_WALLET_CODE,
  }, DEFAULT_JETTON_MINTER_CODE));
  await minter.sendDeploy(admin.getSender(), toNano('0.1'));

  const residual = 1000000n;
  const addAmount = 1000000n;
  const fakeAmount = 1000000000000n;
  await minter.sendMint(admin.getSender(), {
    value: toNano('2'),
    toAddress: donor.address,
    fwdAmount: toNano('1'),
    masterMsg: {
      jettonAmount: residual,
      jettonMinterAddress: minter.address,
      responseAddress: donor.address,
    },
  });
  await minter.sendMint(admin.getSender(), {
    value: toNano('2'),
    toAddress: attacker.address,
    fwdAmount: toNano('1'),
    masterMsg: {
      jettonAmount: addAmount,
      jettonMinterAddress: minter.address,
      responseAddress: attacker.address,
    },
  });

  const routerWalletAddress = await minter.getWalletAddress(router.address);
  const routerWallet = bc.openContract(JettonWalletContract.createFromAddress(routerWalletAddress));
  const donorWallet = bc.openContract(JettonWalletContract.createFromAddress(await minter.getWalletAddress(donor.address)));
  const attackerTokenWallet = bc.openContract(JettonWalletContract.createFromAddress(await minter.getWalletAddress(attacker.address)));
  await donorWallet.sendTransfer(donor.getSender(), {
    value: toNano('2'),
    jettonAmount: residual,
    toAddress: router.address,
    responseAddress: donor.address,
    fwdAmount: 0n,
    fwdPayload: require(`${sourceRoot}/node_modules/@ton/core`).beginCell().endCell(),
  });
  const beforeDeposit = (await routerWallet.getWalletData()).balance;

  const deadline = bc.now + 3600;
  await router.sendProvideLiquidity(fakeWalletA.getSender(), {
    jettonAmount: fakeAmount,
    fromAddress: attacker.address,
    otherWalletAddress: routerWallet.address,
    minLPOut: 0n,
    bothPositive: false,
    toAddress: attacker.address,
    deadline,
  });

  const poolAddress = await router.getPoolAddress({
    firstWalletAddress: fakeWalletA.address,
    secondWalletAddress: routerWallet.address,
  });
  const pool = bc.openContract(Pool.createFromAddress(poolAddress));
  await pool.sendDeploy(admin.getSender(), toNano('2'));

  const provideResult = await attackerTokenWallet.sendTransfer(attacker.getSender(), {
    value: toNano('3'),
    jettonAmount: addAmount,
    toAddress: router.address,
    responseAddress: attacker.address,
    fwdAmount: toNano('1'),
    fwdPayload: provideLpPayload({
      otherTokenAddress: fakeWalletA.address,
      minLpOut: 1n,
      toAddress: attacker.address,
      refundAddress: attacker.address,
      excessesAddress: attacker.address,
      deadline,
    }),
  });
  const routedToFakePair = provideResult.transactions.some((tx) => tx.inMessage?.info?.src?.equals(router.address) && tx.inMessage?.info?.dest?.equals(pool.address));
  console.log(`B_notification_router_to_fake_pair ${routedToFakePair}`);
  must(routedToFakePair, 'B notification did not route to fake pair');

  const lpWalletAddress = await pool.getWalletAddress(attacker.address);
  const lpWallet = bc.openContract(LPWallet.createFromAddress(lpWalletAddress));
  const minted = (await lpWallet.getWalletData()).balance;
  must(minted > 1000n, `LP mint did not complete: ${minted}`);

  const beforeBurn = (await routerWallet.getWalletData()).balance;
  const attackerBWallet = attackerTokenWallet;
  const attackerBefore = (await attackerBWallet.getWalletData()).balance;
  const burnResult = await lpWallet.sendBurnExt(attacker.getSender(), {
    value: toNano('5'),
    jettonAmount: minted - 1n,
  });
  const afterBurn = (await routerWallet.getWalletData()).balance;
  const attackerAfter = (await attackerBWallet.getWalletData()).balance;
  const victimDebit = beforeBurn - afterBurn;
  const attackerCredit = attackerAfter - attackerBefore;

  must(victimDebit > 0n, 'burn did not request a B-token payout');
  must(victimDebit <= addAmount, `payout exceeded the attacker-funded B leg: ${victimDebit}`);
  must(attackerCredit === victimDebit, `B-token transfer mismatch: victim ${victimDebit}, attacker ${attackerCredit}`);
  must(afterBurn >= beforeDeposit, `Router residual B balance dropped below baseline: ${afterBurn} < ${beforeDeposit}`);
  must(burnResult.transactions.some((tx) => tx.inMessage?.info?.src?.equals(router.address) && tx.inMessage?.info?.dest?.equals(routerWallet.address)), 'Router did not emit B wallet transfer');

  console.log(`router_wallet_baseline ${beforeDeposit}`);
  console.log(`router_wallet_after_burn ${afterBurn}`);
  console.log(`attacker_funded_B_leg ${addAmount}`);
  console.log(`fake_A_leg ${fakeAmount}`);
  console.log(`lp_minted ${minted}`);
  console.log(`victim_router_wallet_debit ${victimDebit}`);
  console.log(`attacker_B_wallet_credit ${attackerCredit}`);
  console.log('residual_not_drained true');
  console.log('result PASS');
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
