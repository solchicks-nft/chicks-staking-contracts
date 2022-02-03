
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