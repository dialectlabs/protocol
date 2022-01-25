# dialect

## local development

Please make sure you are always using the latest stable rust version by running: rustup update

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

install solana on m1

1. brew install coreutils
2. https://dev.to/nickgarfield/how-to-install-solana-dev-tools-on-an-m1-mac-kfn

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
solana config set --url http://127.0.0.1:8899
```

### build & deploy

make sure you have SOL via an airdrop

```
solana airdrop 50
```

Run build, the output will be the program address

```
npm run build:program
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

## Open questions

- Read efficiency for determining group members
- Deleting a mint

## design

messaging via the pub-sub pattern, basically you need:

1. an entity that acts as the thing to which ppl pub-sub.
2. a way for someone to know what they've subbed to
3. a way to store ppl's permissions to pub
4. a way to store ppls pubs

in a tokenized design, it's:

1. the token mint
2. holding (any amount of?) the token
   - tbd if
3.

SRM has no authority https://solscan.io/token/SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt, but e.g. solrise does https://solscan.io/token/SLRSSpSLUTP7okbCUBYStWCo1vUgyt775faPqz8HUMr

## Account with list of dialects

Users will need a list of the dialects they're members of, but e.g. protocols won't necessarily want this -- they might be a part of many, and they may only need to find these when they already know the member(s) that belong (this can be derived deterministically). We need a way to either flexibly create or not create the dialects account, or explicitly choose to create or not create it.

### How do users opt-in?

This might be how we relate dialects to the user dialects account.

## etc

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

## examples

Run the example with:

```bash
DIALECT_PUBLIC_KEY=<dialect-public-key> ts-node examples/index.ts
```

It is fine to omit the DIALECT_PUBLIC_KEY environment variable, the example will generate one on the fly. However, if you're using this example as an integration test with other services, such as the notification service, you'll need to set it to the public key corresponding to the private key in the notification service.

## A note about nonce
https://pynacl.readthedocs.io/en/v0.2.1/secret/

### Nonce
The 24 bytes nonce (Number used once) given to encrypt() and decrypt() must ***NEVER*** be reused for a particular key.
Reusing the nonce means an attacker will have enough information to recover your secret key and encrypt or decrypt arbitrary messages.
A nonce is not considered secret and may be freely transmitted or stored in plaintext alongside the ciphertext.

A nonce does not need to be random, nor does the method of generating them need to be secret.
A nonce could simply be a counter incremented with each message encrypted.

Both the sender and the receiver should record every nonce both that they’ve used and they’ve received from the other.
They should reject any message which reuses a nonce and they should make absolutely sure never to reuse a nonce.
It is not enough to simply use a random value and hope that it’s not being reused (simply generating random values would open up the system to a Birthday Attack).

One good method of generating nonces is for each person to pick a unique prefix, for example b"p1" and b"p2". When each person generates a nonce they prefix it, so instead of nacl.utils.random(24) you’d do b"p1" + nacl.utils.random(22). This prefix serves as a guarantee that no two messages from different people will inadvertently overlap nonces while in transit. They should still record every nonce they’ve personally used and every nonce they’ve received to prevent reuse or replays.
