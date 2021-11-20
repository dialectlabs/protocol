# dialect

## local development

### building for local usage

"local usage" means installation of this package through "file://..."

```
> npm install
> npm run build
> npm run local-publish
```

During local-publish step we remove the node_modules from this folder so that, when installed, they are not being consumed during main app's run

### install solana, anchor

TODO: notes

install solana on m1 — https://dev.to/nickgarfield/how-to-install-solana-dev-tools-on-an-m1-mac-kfn

https://project-serum.github.io/anchor/getting-started/installation.html

install anchor —

```
cargo install --git https://github.com/project-serum/anchor --tag v0.18.0 anchor-cli --locked
```

TODO:???

```
npm -g install ts-mocha
npm install -g @project-serum/anchor
```

check your installation with

```
solana balance
```

### run localnoet

```
solana-test-validator --rpc-port 8899
```

### build & deploy

make sure you have SOL via an airdrop

```
solana airdrop 5
```

Run build, the output will be the program address

```
anchor build
```

from the root `protocol/` directory, run

```
anchor deploy
```

this will give you a program id as output, which you should then put in program.json

Put the program address in 3 places

1. Anchor.toml

```
[programs.localnet]
dialect = "<PROGRAM-ADDRESS>"
```

2. lib.rs

```
declare_id!("<PROGRAM-ADDRESS>");
```

3. programs.json

```
{
  "localnet": {
    "clusterAddress": "http://10.0.0.253:8899",
    "programAddress": "<PROGRAM-ADDRESS>"
  },
  ...
}
```

Run in frontend repo, which uses @dialect/web3

```
npm i @dialect/web3 ??? force update
```

### ISSUES

```
error An unexpected error occurred: "unsure how to copy this: /Users/kirillchernakov/Documents/projects/dialect/protocol/test-ledger/admin.rpc".
```

q fix

```

```
