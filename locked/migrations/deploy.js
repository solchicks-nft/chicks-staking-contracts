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
  let isDev = false;
  if (program.programId.toString() === 'AVauy78yvW2K6QUfUSfPtcxPEaT3V6W1xwGEQQSFDAPC') {
    mintPubkey = new anchor.web3.PublicKey("FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ"); // token address
    isDev = true;
  } else {
    mintPubkey = new anchor.web3.PublicKey("cxxShYRVcepDudXhe7U62QHvw8uBJoKFifmzggGKVC2"); // token address
  }

  const STAKING_PDA_SEED = "staking_v2";

  const lockTime1 = new anchor.BN(3600 * 24 * 30 * 4 ) // 4 months
  let pool_handle1 = "pool1";

  const lockTime2 = new anchor.BN(3600 * 24 * 30 * 8 ) // 8 months
  let pool_handle2 = "pool2";

  const lockTime3 = new anchor.BN(3600 * 24 * 30 * 12 ) // 12 months
  let pool_handle3 = "pool3";

  const [vaultPubkey1, vaultBump1] = await anchor.web3.PublicKey.findProgramAddress(
    [mintPubkey.toBuffer(), pool_handle1],
    program.programId
  )

  const [stakingPubkey1, stakingBump1] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(STAKING_PDA_SEED)), pool_handle1],
      program.programId
    )

  const [vaultPubkey2, vaultBump2] = await anchor.web3.PublicKey.findProgramAddress(
    [mintPubkey.toBuffer(), pool_handle2],
    program.programId
  )

  const [stakingPubkey2, stakingBump2] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(STAKING_PDA_SEED)), pool_handle2],
      program.programId
    )

  const [vaultPubkey3, vaultBump3] = await anchor.web3.PublicKey.findProgramAddress(
    [mintPubkey.toBuffer(), pool_handle3],
    program.programId
  )

  const [stakingPubkey3, stakingBump3] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(STAKING_PDA_SEED)), pool_handle3],
      program.programId
    )

  console.log('program id', program.programId.toString());
  console.log('vaultPubkey1', vaultPubkey1.toString(), vaultBump1);
  console.log('stakingPubkey1', stakingPubkey1.toString(), stakingBump1);
  console.log('vaultPubkey2', vaultPubkey2.toString(), vaultBump2);
  console.log('stakingPubkey2', stakingPubkey2.toString(), stakingBump2);
  console.log('vaultPubkey3', vaultPubkey3.toString(), vaultBump3);
  console.log('stakingPubkey3', stakingPubkey3.toString(), stakingBump3);

  // console.log('Before');
  // try {
  //   let stakingAccount = await program.account.stakingAccount.fetch(
  //     stakingPubkey
  //   );
  //   console.log('stakingAccount', stakingAccount);
  // } catch (e) {
  //   console.log(e);
  // }

  // init
  try {
    await program.rpc.initialize(vaultBump1, stakingBump1, pool_handle1, lockTime1, {
      accounts: {
        tokenMint: mintPubkey,
        tokenVault: vaultPubkey1,
        stakingAccount: stakingPubkey1,
        initializer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
    console.log('Locked Pool - 1 - Done');
  } catch(e) {
    console.log(e);
  }

  try {
    await program.rpc.initialize(vaultBump2, stakingBump2, pool_handle2, lockTime2, {
      accounts: {
        tokenMint: mintPubkey,
        tokenVault: vaultPubkey2,
        stakingAccount: stakingPubkey2,
        initializer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    })
    console.log('Locked Pool - 2 - Done');
  } catch(e) {
    console.log(e);
  }

  try {
    await program.rpc.initialize(vaultBump3, stakingBump3, pool_handle3, lockTime3, {
      accounts: {
        tokenMint: mintPubkey,
        tokenVault: vaultPubkey3,
        stakingAccount: stakingPubkey3,
        initializer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    })
    console.log('Locked Pool - 3 - Done');
  } catch(e) {
    console.log(e);
  }

  if (isDev) {
    console.log('start - updateLockTime');
    await program.rpc.updateLockTime(
      stakingBump1,
      pool_handle1,
      new anchor.BN(300),
      {
        accounts: {
          initializer: provider.wallet.publicKey,
          stakingAccount: stakingPubkey1,
        },
      });

    try {
      let stakingAccount1 = await program.account.stakingAccount.fetch(
        stakingPubkey1
      );
      console.log('stakingAccount', stakingAccount1);
    } catch (e) {
      console.log(e);
    }
    console.log('Done pool1');

    await program.rpc.updateLockTime(
      stakingBump2,
      pool_handle2,
      new anchor.BN(450 ),
      {
      accounts: {
        initializer: provider.wallet.publicKey,
        stakingAccount: stakingPubkey2,
      },
    });
    try {
      let stakingAccount2 = await program.account.stakingAccount.fetch(
        stakingPubkey2
      );
      console.log('stakingAccount', stakingAccount2);
    } catch (e) {
      console.log(e);
    }
    console.log('Done pool2');

    await program.rpc.updateLockTime(
      stakingBump3,
      pool_handle3,
      new anchor.BN(600 ),
      {
      accounts: {
        initializer: provider.wallet.publicKey,
        stakingAccount: stakingPubkey3,
      },
    });
    try {
      let stakingAccount3 = await program.account.stakingAccount.fetch(
        stakingPubkey1
      );
      console.log('stakingAccount', stakingAccount3);
    } catch (e) {
      console.log(e);
    }
    console.log('Done pool3');
  }
}
