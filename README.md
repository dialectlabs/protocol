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

## Tokenized communication

### Memos

https://explorer.solana.com/tx/47eaxtBi6JY5GHvKmsdJcRba1PE7T19X4QX2dQ6FVpA2wuUwpxjFa6pgKnaassbmgKiwiewy6RhMCEpgzd6h6RfV


## Upgrading anchor

If you get the error

```bash
error[E0460]: found possibly newer version of crate `std` which `rustc_version` depends on
```

the simplest solution is to `rm -r target/`.

## Adding new workspace

From the root dir

```bash
anchor new <program-name>
```

This will create a new `/programs/<program-name>/` directory with boilerplate.

## Debugging

Convert `0x<n>` from hex, look up error number here. https://github.com/project-serum/anchor/blob/master/lang/src/error.rs