/* eslint-disable */
// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@project-serum/anchor");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const fs = require('fs');

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  let program = anchor.workspace.ChicksStakingLocked;

  let mintPubkey;
  if (program.programId.toString() === '7ANFv22yZ6qxxg6yZjgQmaaJAQUJKjq3hJpWpjz8JJ1e') {
    mintPubkey = new anchor.web3.PublicKey("FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ"); // token address
  } else {
    mintPubkey = new anchor.web3.PublicKey("cxxShYRVcepDudXhe7U62QHvw8uBJoKFifmzggGKVC2"); // token address
  }

  const [vaultPubkey, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
    [mintPubkey.toBuffer()],
    program.programId
  )

  const [stakingPubkey, stakingBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode('staking'))],
      program.programId
    )
  console.log('program id', program.programId.toString());
  console.log('vaultPubkey', vaultPubkey.toString(), vaultBump);
  console.log('stakingPubkey', stakingPubkey.toString(), stakingBump);

  console.log('Before');
  try {
    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    console.log('stakingAccount', stakingAccount);
  } catch (e) {
    console.log(e);
  }

  // init
  const lockTime1 = new anchor.BN(3600 * 24 * 30 * 4 ) // 4 months
  let pool_handle1 = "pool1";

  const lockTime2 = new anchor.BN(3600 * 24 * 30 * 8 ) // 8 months
  let pool_handle2 = "pool2";

  const lockTime3 = new anchor.BN(3600 * 24 * 30 * 12 ) // 12 months
  let pool_handle3 = "pool3";

  try {
    await program.rpc.initialize(vaultBump, stakingBump, lockTime, fee_percent, {
      accounts: {
        tokenMint: mintPubkey,
        tokenVault: vaultPubkey,
        stakingAccount: stakingPubkey,
        initializer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    })
  } catch(e) {
    console.log(e);
  }


}
