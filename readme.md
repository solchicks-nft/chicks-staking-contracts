
### Flexible pool
```shell
1. cd flexible

2. anchor build

3. anchor keys list
You can see the program id.

4. Update program id in ./Anchor.toml and ./programs/chicks-staking-flexible/src/lib.rs

5. anchor build

6. update provider config in Anchor.toml
> comment
#[provider]
#cluster = "devnet"
#wallet = "/home/bmstart/work/solana/keys/alice.json"

> uncomment
[provider]
cluster = "mainnet"
wallet = "/home/bmstart/work/solana/keys/alice.json"
 
7. anchor deploy
Note: please check if solana is enough (over 6 sol)

8. anchor migrate
```

### test
```
anchor test -- --features local-testing,test-id
```

### Transfer Token
#### For dev
```
spl-token transfer FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ 100 C7aNpsGD3wtxnP69EN2NWe2KvkPh3XDuu65sPPMCHqxM
```

#### For live
```
spl-token transfer cxxShYRVcepDudXhe7U62QHvw8uBJoKFifmzggGKVC2 100 4cjY4z5gGeEWR22H1CmBTk2JwDQVG2az6tExFTBaM4GT
```
#### Vault account
https://explorer.solana.com/address/4cjY4z5gGeEWR22H1CmBTk2JwDQVG2az6tExFTBaM4GT

https://solscan.io/account/4cjY4z5gGeEWR22H1CmBTk2JwDQVG2az6tExFTBaM4GT#splTransfer
