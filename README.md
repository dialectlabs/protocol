# dialect

## local development

### install solana, anchor

notes coming soon

### run localnoet

```
solana-test-validator --rpc-port 8899
```

### deploy

make sure you have SOL via an airdrop

```
solana airdrop 10
```

from the root `protocol/` directory, run

```
anchor deploy
```

this will give you a program id as output, which you should then put in program.json