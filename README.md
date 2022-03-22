# Protocol & web3

Dialect is a smart messaging protocol for dapp notifications and wallet-to-wallet messaging on the Solana Blockchain.

Dialect works by decorating on-chain resources, or sets of resources, with publish-subscribe (pub-sub) messaging capabilities. This is accomplished by creating a PDA whose seeds are the (lexically sorted) resources' public keys. Each pub-sub messaging PDA is called a _dialect_.

Dialect `v0` currently supports one-to-one messaging between wallets, which powers both dapp notifications as well as user-to-user chat. Future versions of Dialect will also support one-to-many and many-to-many messaging.

This repository contains both the Dialect rust programs (protocol), in Anchor, as well as a typescript client, published to npm as `@dialectlabs/web3`.

Currently, the dialect account rent cost is `~0.059 SOL`.

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

## Local development

Note: If you just need a local running instance of the Dialect program, it is easiest to simply run Dialect in a docker container. See the [Docker](###docker) section below.

Dialect is built with Solana and Anchor. Install both dependencies first following their respective documentation

- [Solana](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://book.anchor-lang.com) v0.18.0

Be sure you are targeting a Solana `localnet` instance:

```shell
solana config set --url localhost
```

Run a local validator:

```shell
solana-test-validator --rpc-port 8899
```

Build the Dialect Solana program:

```shell
anchor build
```

If you haven't deployed before, the output of `anchor build` will give you a program keypair, stored in `target/deploy/dialect-keypair.json`.\
Note: if it doesn't print a keypair, fetch it with the following command:
`solana address -k target/deploy/dialect-keypair.json`


Add this keypair in the following additional places:

1. In the `dialect = "<program-id>"` in `Anchor.toml`
2. In the `declare_id!("<program-id>")` in `programs/dialect/lib.rs`
3. In the `localnet` key in `src/utils/program.json` (redundant, to be retired)

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

## examples

Run the example with:

```bash
DIALECT_PUBLIC_KEY=<dialect-public-key> ts-node examples/index.ts
```

It is fine to omit the `DIALECT_PUBLIC_KEY` environment variable, the example will generate one on the fly. However, if you're using this example as an integration test with other services, such as the monitoring, you'll need to set it to the public key corresponding to the private key in the notification service.

## Message encryption

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
