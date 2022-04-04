# Protocol & web3

## Summary

Dialect is a smart messaging protocol for dapp notifications and wallet-to-wallet messaging on the Solana Blockchain.

Dialect works by decorating on-chain resources, or sets of resources, with publish-subscribe (pub-sub) messaging capabilities. This is accomplished by creating a PDA whose seeds are the (lexically sorted) resources' public keys. Each pub-sub messaging PDA is called a _dialect_.

Dialect `v0` currently supports one-to-one messaging between wallets, which powers both dapp notifications as well as user-to-user chat. Future versions of Dialect will also support one-to-many and many-to-many messaging.

This repository contains both the Dialect rust programs (protocol), in Anchor, as well as a typescript client, published to npm as `@dialectlabs/web3`.

Currently, the dialect account rent cost is `~0.059 SOL`.

## Table of Contents
1. Installation
2. Usage
3. Local Development
4. Docker
5. Anchor Tests
6. Examples
7. Message Encryption

## Installation

**npm:**

```shell
npm install @dialectlabs/protocol --save
```

**yarn:**

```shell
yarn add @dialectlabs/protocol
```

## Usage

This section describes how to use Dialect protocol in your app by showing you examples in the`examples/` directory of this repository. Follow along in this section, & refer to the code in those examples.

### Create your first dialect, send and receive message

The example in `examples/hello-world.ts` demonstrates how to create a new dialect, send and receive message.

```typescript
import {
  createDialect,
  getDialectForMembers,
  sendMessage,
  Member,
} from '@dialectlabs/protocol';

const program = // ... initialize dialect program

const [user1, user2] = [Keypair.generate(), Keypair.generate()];
// ... fund keypairs
const dialectMembers: Member[] = [
  {
    publicKey: user1.publicKey,
    scopes: [true, true],
  },
  {
    publicKey: user2.publicKey,
    scopes: [false, true],
  },
];
const user1Dialect = await createDialect(
  program,
  user1,
  dialectMembers,
  false,
); // crate dialect on behalf of 1st user
await sendMessage(program, user1Dialect, user1, 'Hello dialect!'); // send message
const { dialect: user2Dialect } = await getDialectForMembers(
  program,
  dialectMembers,
  user2,
); // get dialect on behalf of 2nd user
console.log(JSON.stringify(user2Dialect.messages));
// Will print [{"text":"Hello dialect!", ...}]
```

Run the example above

```shell
ts-node examples/hello-world.ts
```

## Local Development

Note: If you just need a local running instance of the Dialect program, it is easiest to simply run Dialect in a docker container. See the [Docker](###docker) section below.

Dialect is built with Solana and Anchor. Install both dependencies first following their respective documentation

- [Solana](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://book.anchor-lang.com) v0.18.0

We recommend installing anchor with [avm](https://book.anchor-lang.com/chapter_2/installation.html#installing-using-anchor-version-manager-avm-recommended) and using the `"@project-serum/anchor"` version that's specified in our [package.json](https://github.com/dialectlabs/protocol/blob/master/package.json) file.

Be sure you are targeting a Solana `localnet` instance:

```shell
solana config set --url localhost
```

Next run the tests to verify everything is setup correctly:

First ensure you have ts-mocha installed globally:

```shell
npm install -g ts-mocha
```

Run the tests with:

```shell
anchor test
```

Run a local validator:

```shell
solana-test-validator --rpc-port 8899
```

Build the Dialect Solana program:

```shell
anchor build
```

If you haven't deployed this program to localnet before, `anchor build` produces a program-id stored in `target/idl/dialect.json`. The program-id is the address field of the "metadata" element (usually at bottom of file, note your address may differ locally):

```json
  "metadata": {
    "address": "2YFyZAg8rBtuvzFFiGvXwPHFAQJ2FXZoS7bYCKticpjk"
  }
```

Alternatively, you can get this program id from the command

```bash
solana address -k target/deploy/dialect-keypair.json
```

Add this program id in the following additional places before proceeding:

1. In the `dialect = "<program-id>"` in `Anchor.toml`
2. In the `declare_id!("<program-id>")` in `programs/dialect/lib.rs`
3. In the `localnet` key in `src/utils/program.json` (redundant, to be retired)

Before deploying make sure you fund your Solana wallet:

You can fund your wallet with:
```shell
solana airdrop 10
```

You can verify your token balance with:
```shell
solana balance
```

Deploy the Dialect Solana program with:

```shell
anchor deploy
```

Finally, install the `js`/`ts` `npm` dependencies with

```shell
npm i
```

### Docker

The Dialect docker image will get you a deployed Dialect program running on a Solana validator. This is ideal if you're building off of `@dialectlabs/protocol`, rather than actively developing on it.

```bash
# build
docker build -f docker/Dockerfile . -t dialect/protocol:latest

# run
docker run -i --rm -p 8899:8899 -p 8900:8900 -p 9900:9900 --name protocol dialect/protocol:latest
```

## Tests

First ensure you have ts-mocha install globally:

```shell
npm install -g ts-mocha
```

Run the tests with:

```shell
anchor test
```

## Examples

Run the example with:

```bash
DIALECT_PUBLIC_KEY=<dialect-public-key> ts-node examples/hello-world.ts
```

It is fine to omit the `DIALECT_PUBLIC_KEY` environment variable, the example will generate one on the fly. However, if you're using this example as an integration test with other services, such as the monitoring service, you'll need to set it to the public key corresponding to the private key in the monitoring service.

## Message Encryption

A note about the encryption nonce.

https://pynacl.readthedocs.io/en/v0.2.1/secret/

### Nonce

The 24 bytes nonce (Number used once) given to encrypt() and decrypt() must **_NEVER_** be reused for a particular key.
Reusing the nonce means an attacker will have enough information to recover your secret key and encrypt or decrypt arbitrary messages.
A nonce is not considered secret and may be freely transmitted or stored in plaintext alongside the ciphertext.

A nonce does not need to be random, nor does the method of generating them need to be secret.
A nonce could simply be a counter incremented with each message encrypted.

Both the sender and the receiver should record every nonce both that they’ve used and they’ve received from the other.
They should reject any message which reuses a nonce and they should make absolutely sure never to reuse a nonce.
It is not enough to simply use a random value and hope that it’s not being reused (simply generating random values would open up the system to a Birthday Attack).

One good method of generating nonces is for each person to pick a unique prefix, for example b"p1" and b"p2". When each person generates a nonce they prefix it, so instead of nacl.utils.random(24) you’d do b"p1" + nacl.utils.random(22). This prefix serves as a guarantee that no two messages from different people will inadvertently overlap nonces while in transit. They should still record every nonce they’ve personally used and every nonce they’ve received to prevent reuse or replays.
