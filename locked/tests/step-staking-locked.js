/* eslint-disable */
const anchor = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token');
const utils = require('./utils');
const assert = require('assert');
const fs = require('fs');
const md5 = require('md5');
const {
  PublicKey,
} = require('@solana/web3.js');

let program = anchor.workspace.ChicksStakingLocked;
console.log(program);

let programId = new PublicKey('AVauy78yvW2K6QUfUSfPtcxPEaT3V6W1xwGEQQSFDAPC');

//Read the provider from the configured environmnet.
//represents an outside actor
//owns mints out of any other actors control, provides initial $$ to others
const envProvider = anchor.Provider.env();

//we allow this convenience var to change between default env and mock user(s)
//initially we are the outside actor
let provider = envProvider;
//convenience method to set in anchor AND above convenience var
//setting in anchor allows the rpc and accounts namespaces access
//to a different wallet from env
function setProvider(p) {
  provider = p;
  anchor.setProvider(p);
  program = new anchor.Program(program.idl, programId, p);
}
setProvider(provider);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

console.log("md5", md5('test'));

describe('step-staking-locked', async () => {
  //hardcoded in program, read from test keys directory for testing
  let mintKey;
  let mintObject;
  let mintPubkey;

  //the program's vault for stored collateral against xToken minting
  let vaultPubkey;
  let vaultBump;

  //the program's account for stored initializer key and lock end date
  let stakingPubkey;
  let stakingBump;
  let lock_time = new anchor.BN(3600 * 24 * 7 * 8); //8 weeks
  let new_lock_time = new anchor.BN(1);
  const STAKING_PDA_SEED = "staking_v2";
  let pool_handle = "pool1";
  // let feePercent = 250; //new anchor.BN(250);

  //the user's staking account for stored deposit amount
  let userStakingPubkey;
  let userStakingBump;
  let userStakingPubkey2;
  let userStakingBump2;

  it('Is initialized!', async () => {
    //setup logging event listeners
    // program.addEventListener('PriceChange', (e, s) => {
    //   console.log('Price Change In Slot ', s);
    //   console.log('From', e.oldStepPerXstepE9.toString());
    //   console.log('From', e.oldStepPerXstep.toString());
    //   console.log('To', e.newStepPerXstepE9.toString());
    //   console.log('To', e.newStepPerXstep.toString());
    // });

    //this already exists in ecosystem
    //test step token hardcoded in program, mint authority is wallet for testing
    let rawdata = fs.readFileSync(
      'tests/keys/step-teST1ieLrLdr4MJPZ7i8mgSCLQ7rTrPRjNnyFdHFaz9.json'
    );
    let keyData = JSON.parse(rawdata);
    mintKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    mintObject = await utils.createMint(
      mintKey,
      provider,
      provider.wallet.publicKey,
      null,
      9,
      TOKEN_PROGRAM_ID
    );
    mintPubkey = mintObject.publicKey;

    [vaultPubkey, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [mintPubkey.toBuffer(), pool_handle],
      programId
    );

    [stakingPubkey, stakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode(STAKING_PDA_SEED)), pool_handle],
        programId
      );

    console.log("stakingPubkey", stakingPubkey.toString());
    console.log("vaultPubkey", vaultPubkey.toString());
    console.log("programId", programId.toString());
    console.log(pool_handle);

    await program.rpc.initialize(vaultBump, stakingBump, pool_handle, lock_time, {
      accounts: {
        tokenMint: mintPubkey,
        tokenVault: vaultPubkey,
        stakingAccount: stakingPubkey,
        initializer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
  });

  let walletTokenAccount;

  it('Mint test tokens', async () => {
    walletTokenAccount = await mintObject.createAssociatedTokenAccount(
      provider.wallet.publicKey
    );
    await utils.mintToAccount(
      provider,
      mintPubkey,
      walletTokenAccount,
      1000_000_000_000
    );
  });

  it('1: Swap token for xToken', async () => {
    const handle1 = 'test1';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );

    console.log("tokenMint", mintPubkey.toString());
    console.log("tokenFrom", walletTokenAccount.toString());
    console.log("tokenFromAuthority", provider.wallet.publicKey.toString());
    console.log("tokenVault", vaultPubkey.toString());
    console.log("stakingAccount", stakingPubkey.toString());
    console.log("userStakingAccount", userStakingPubkey.toString());

    await program.rpc.stake(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(100_000_000_000),
      {
        accounts: {
          tokenMint: mintPubkey,
          tokenFrom: walletTokenAccount,
          tokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
    );

    let amount = new anchor.BN(100_000_000_000);

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), amount.toNumber());

    let userStakingAccount = await program.account.userStakingAccount.fetch(
      userStakingPubkey
    );

    assert.strictEqual(parseInt(userStakingAccount.amount), amount.toNumber());
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      900_000_000_000
    );
    assert.strictEqual(parseInt(userStakingAccount.amount), amount.toNumber());
    assert.strictEqual(
      parseInt(userStakingAccount.xTokenAmount),
      amount.toNumber()
    );
    assert.strictEqual(await getTokenBalance(vaultPubkey), 100_000_000_000);
  });

  it('Redeem xToken for token before lock end time', async () => {
    const handle1 = 'test1';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );

    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await assert.rejects(
      async () => {
        await program.rpc.unstake(
          vaultBump,
          stakingBump,
          userStakingBump,
          pool_handle,
          key1,
          new anchor.BN(0), // not error
          {
            accounts: {
              tokenMint: mintPubkey,
              xTokenFromAuthority: provider.wallet.publicKey,
              tokenVault: vaultPubkey,
              stakingAccount: stakingPubkey,
              userStakingAccount: userStakingPubkey,
              tokenTo: walletTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
            },
          }
        );
      },
      { code: 6000, msg: 'Not exceed lock end date' }
    );
  });

  it('Update lock end date', async () => {
    await program.rpc.updateLockTime(
      stakingBump,
      pool_handle,
      new_lock_time,
      {
      accounts: {
        initializer: provider.wallet.publicKey,
        stakingAccount: stakingPubkey,
      },
    });

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    console.log("stakingAccount.lock_time", stakingAccount);
    assert.strictEqual(
      parseInt(stakingAccount.lockTime),
      new_lock_time.toNumber()
    );
  });

  it('2: Swap token for xToken', async () => {
    const handle1 = 'test2';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );

    console.log("tokenMint", mintPubkey.toString());
    console.log("tokenFrom", walletTokenAccount.toString());
    console.log("tokenFromAuthority", provider.wallet.publicKey.toString());
    console.log("tokenVault", vaultPubkey.toString());
    console.log("stakingAccount", stakingPubkey.toString());
    console.log("userStakingAccount", userStakingPubkey.toString());

    let amount = new anchor.BN(200_000_000_000);

    await program.rpc.stake(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      amount,
      {
        accounts: {
          tokenMint: mintPubkey,
          tokenFrom: walletTokenAccount,
          tokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 300_000_000_000);

    let userStakingAccount = await program.account.userStakingAccount.fetch(
      userStakingPubkey
    );

    assert.strictEqual(parseInt(userStakingAccount.amount), amount.toNumber());
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      700_000_000_000
    );
    assert.strictEqual(parseInt(userStakingAccount.amount), amount.toNumber());
    assert.strictEqual(
      parseInt(userStakingAccount.xTokenAmount),
      amount.toNumber()
    );
    assert.strictEqual(await getTokenBalance(vaultPubkey), 300_000_000_000);
  });

  it('Deposit', async () => {
    console.log("tokenMint", mintPubkey.toString());
    console.log("tokenFrom", walletTokenAccount.toString());
    console.log("tokenFromAuthority", provider.wallet.publicKey.toString());
    console.log("tokenVault", vaultPubkey.toString());
    console.log("stakingAccount", stakingPubkey.toString());

    let amount = new anchor.BN(60_000_000_000);

    await program.rpc.deposit(
      vaultBump,
      stakingBump,
      pool_handle,
      amount,
      {
        accounts: {
          tokenMint: mintPubkey,
          tokenFrom: walletTokenAccount,
          tokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 360_000_000_000);

    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      640_000_000_000
    );
    assert.strictEqual(await getTokenBalance(vaultPubkey), 360_000_000_000);
  });

  it('1: Redeem xToken after lock end time', async () => {
    await sleep(3000);
    const handle1 = 'test1';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );
    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await program.rpc.unstake(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(0), // not error
      {
        accounts: {
          tokenMint: mintPubkey,
          xTokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          tokenTo: walletTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    console.log("checking --- result");

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 240_000_000_000);

    let userStakingAccount = await program.account.userStakingAccount.fetch(
      userStakingPubkey
    );

    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      740_000_000_000
    );
    assert.strictEqual(parseInt(userStakingAccount.amount), 0);
    assert.strictEqual(parseInt(userStakingAccount.xTokenAmount), 0);
    assert.strictEqual(parseInt(userStakingAccount.rewards), 20_000_000_000);

    assert.strictEqual(await getTokenBalance(vaultPubkey), 260_000_000_000);
  });

  it('3: Swap token for xToken', async () => {
    const handle1 = 'test3';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );

    console.log("tokenMint", mintPubkey.toString());
    console.log("tokenFrom", walletTokenAccount.toString());
    console.log("tokenFromAuthority", provider.wallet.publicKey.toString());
    console.log("tokenVault", vaultPubkey.toString());
    console.log("stakingAccount", stakingPubkey.toString());
    console.log("userStakingAccount", userStakingPubkey.toString());

    let amount = new anchor.BN(30_000_000_000);

    await program.rpc.stake(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      amount,
      {
        accounts: {
          tokenMint: mintPubkey,
          tokenFrom: walletTokenAccount,
          tokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
    );

    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      710_000_000_000
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 270_000_000_000);
    assert.strictEqual(parseInt(stakingAccount.totalXToken), 225_000_000_000);

    let userStakingAccount = await program.account.userStakingAccount.fetch(
      userStakingPubkey
    );

    assert.strictEqual(parseInt(userStakingAccount.amount), amount.toNumber());
    assert.strictEqual(
      parseInt(userStakingAccount.xTokenAmount),
      25_000_000_000
    );
    assert.strictEqual(await getTokenBalance(vaultPubkey), 290_000_000_000);
  });

  it('2: Redeem xToken after lock end time', async () => {
    await sleep(3000);
    const handle1 = 'test2';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );
    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await program.rpc.unstake(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(0), // not error
      {
        accounts: {
          tokenMint: mintPubkey,
          xTokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          tokenTo: walletTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    console.log("checking --- result");
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      910_000_000_000
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 30_000_000_000);

    let userStakingAccount = await program.account.userStakingAccount.fetch(
      userStakingPubkey
    );

    assert.strictEqual(parseInt(userStakingAccount.amount), 0);
    assert.strictEqual(parseInt(userStakingAccount.xTokenAmount), 0);
    assert.strictEqual(parseInt(userStakingAccount.rewards), 40_000_000_000);

    assert.strictEqual(await getTokenBalance(vaultPubkey), 90_000_000_000);
  });

  it('1: Reward', async () => {
    const handle1 = 'test1';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );
    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await program.rpc.reward(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(0), // not error
      {
        accounts: {
          tokenMint: mintPubkey,
          xTokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          tokenTo: walletTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    console.log("checking --- result");
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      930_000_000_000
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 30_000_000_000);

    // let userStakingAccount = await program.account.userStakingAccount.fetch(
    //   userStakingPubkey
    // );
    //
    // assert.strictEqual(parseInt(userStakingAccount.amount), 0);
    // assert.strictEqual(parseInt(userStakingAccount.xTokenAmount), 0);
    // assert.strictEqual(parseInt(userStakingAccount.rewards), 0);

    assert.strictEqual(await getTokenBalance(vaultPubkey), 70_000_000_000);
  });

  it('2: Reward', async () => {
    const handle1 = 'test2';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );
    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await program.rpc.reward(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(0), // not error
      {
        accounts: {
          tokenMint: mintPubkey,
          xTokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          tokenTo: walletTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    console.log("checking --- result");
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      970_000_000_000
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 30_000_000_000);

    // let userStakingAccount = await program.account.userStakingAccount.fetch(
    //   userStakingPubkey
    // );
    //
    // assert.strictEqual(parseInt(userStakingAccount.amount), 0);
    // assert.strictEqual(parseInt(userStakingAccount.xTokenAmount), 0);
    // assert.strictEqual(parseInt(userStakingAccount.rewards), 0);

    assert.strictEqual(await getTokenBalance(vaultPubkey), 30_000_000_000);
  });

  it('3: Redeem xToken after lock end time', async () => {
    const handle1 = 'test3';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );
    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await program.rpc.unstake(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(0), // not error
      {
        accounts: {
          tokenMint: mintPubkey,
          xTokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          tokenTo: walletTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    console.log("checking --- result");
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      1000_000_000_000
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 0);

    let userStakingAccount = await program.account.userStakingAccount.fetch(
      userStakingPubkey
    );

    assert.strictEqual(parseInt(userStakingAccount.amount), 0);
    assert.strictEqual(parseInt(userStakingAccount.xTokenAmount), 0);
    assert.strictEqual(parseInt(userStakingAccount.rewards), 0);

    assert.strictEqual(await getTokenBalance(vaultPubkey), 0);
  });

  it('3: Reward', async () => {
    const handle1 = 'test3';
    const key1 = md5(handle1);
    [userStakingPubkey, userStakingBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [provider.wallet.publicKey.toBuffer(), key1],
        programId
      );
    console.log("xTokenFromAuthority", provider.wallet.publicKey.toString())
    console.log("vaultPubkey", vaultPubkey.toString())
    console.log("stakingPubkey", stakingPubkey.toString())
    console.log("userStakingPubkey", userStakingPubkey.toString())

    await program.rpc.reward(
      vaultBump,
      stakingBump,
      userStakingBump,
      pool_handle,
      key1,
      new anchor.BN(0), // not error
      {
        accounts: {
          tokenMint: mintPubkey,
          xTokenFromAuthority: provider.wallet.publicKey,
          tokenVault: vaultPubkey,
          stakingAccount: stakingPubkey,
          userStakingAccount: userStakingPubkey,
          tokenTo: walletTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    console.log("checking --- result");
    assert.strictEqual(
      await getTokenBalance(walletTokenAccount),
      1000_000_000_000
    );

    let stakingAccount = await program.account.stakingAccount.fetch(
      stakingPubkey
    );
    assert.strictEqual(parseInt(stakingAccount.totalToken), 0);

    // let userStakingAccount = await program.account.userStakingAccount.fetch(
    //   userStakingPubkey
    // );
    //
    // assert.strictEqual(parseInt(userStakingAccount.amount), 0);
    // assert.strictEqual(parseInt(userStakingAccount.xTokenAmount), 0);
    // assert.strictEqual(parseInt(userStakingAccount.rewards), 0);

    assert.strictEqual(await getTokenBalance(vaultPubkey), 0);
  });

});

async function getTokenBalance(pubkey) {
  return parseInt(
    (await provider.connection.getTokenAccountBalance(pubkey)).value.amount
  );
}
