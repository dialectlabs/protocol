# Dialect

## Introduction

Dialect is a messaging & communications protocol on the Solana blockchain, as well as a suite of surrounding tooling to help web3 developers integrate that messaging into their protocols and dapps. Dialect supports both encrypted & unencrypted messaging for a variety of use cases, such as

1. wallet -> wallet & multi-wallet group messaging,
2. protocol -> wallet messaging for e.g. dapp notifications,
3. broadcast-style messaging, such as token mint authority -> token holders, for global, trusted messaging to all token holders,
4. NFT master edition authority -> print edition holders, for messaging to all NFT holders in a set (also broadcast-style),

& many more.

Dialect makes the above possible by "decorating" arbitrary on-chain resources – & combinations of resources – with messaging capabilities. By utilizing Solana's inherent authentication & ownership models to determine who can decorate what resources and who can publish messages to them, Dialect brings communication closer to the resources that it is concerned with, enhancing trust, minimizing spam & reducing fraud.

### Motivation

Performing actions and storing data on chain is more resource-constrained than doing so off chain. Dialect's primary use cases are therefore those which explicitly benefit from being on chain.

With that said, the internet's messaging incumbents such as SMS, SMTP, and other web2-native, silod services such as Discord are burdened by legacy design decisions whose consequences were understandably hard to anticipate. Spam and fraud are ubiquitous.

Blockchain's inherent financialization, universal authentication, and composability open up an large new design space, and provide an opportunity to build an internet messaging infrastructure for the next generation.

### Document overview

In the rest of this document, we provide a conceptual overview of how Dialect works, a detailed technical description of its design, an in-depth guide on how it can be integrated into other protocols and dapps, and lastly, a sneak-peak on how the Dialect protocol can be extended & composed to support richer use cases beyond its core functionality.

## Quickstart

To do.

## Concepts

Dialect uses the publish-subscribe messaging pattern, also known as pub-sub. In this design, messages are not explicitly sent to recipients, but are rather published to an independent entity, to which recipients can then subscribe. For example, sending mail via the US postal service is not pub-sub, but posting a message on a bulletin board at a town hall is.

Although private, one-on-one communication feels more like the former, it is in fact easily implemented using the pub-sub pattern, and in many ways benefits from the pub-sub design pattern. (For example, how easy is it to get a list of all the mail you've ever sent via post?)

We call every created pub-sub entity a _Dialect_.

### Dialects & decoration

Dialects are created by instantiating Program-Derived Addresses (PDAs) whose seeds are the sorted addresses of the resources that messaging is concerned with. We call this process _decoration_, analogous to how Metaplex decorates an NFT with its Master Edition metadata.

Because all blockchain addresses are unique, Dialects may be safely created for any resource or combination of resources without concern for collisions.

```typescript
const dialectAccount = await createDialect(
    program,
    type,
    resources,
    {
        ...
    }
);
```

Using these derived addresses, any client or dapp that implements the dialect standard can then efficiently query for dialects nd messages associated with the resources it cares about:

```typescript
const dialectAccount = await getDialect(program, resources);
```

Because dialects are PDAs, the above is a simple wrapper on Solana's `findProgrammAddress(...)`.

### Publishing & subscribing

Once a dialect has been created, those with the appropriate scopes can publish messages, and its members can subscribe to read those messages, performing decryption where necessary.

## Types of dialects

Let's look at two types of dialects: a standard dialect and a token dialect.

### Standard dialects

Standard dialects accommodate messaging most familiar from web2: one-on-one messaging & group chats. In this case, standard dialects are PDAs whose seeds are simply the sorted addresses of the participating members.

```typescript
const dialectAccount = await createDialect(
    program,
    type,
    [member0, member1, ...],
    {
        ...
    }
);
```

To accommodate Solana's compute constraints, Standard Dialects can be created with up to 8 members. See below on adding and removing members after creation, and on encrypting messages.

### Token dialects

Token dialects are those whose single seed resource is a token mint. In this design, the authority to create (& most likely to publish to) the dialect is the token mint authority. The other members are not enumerated explicitly in its members, but instead are the token holders of that mint. Messages are not encrypted.

```typescript
const dialectAccount = await createDialect(
    program,
    type,
    [tokenMint],
    { ... },
);
```

Token dialects are an efficient, trusted means for mint authorities to broadcast messages to their token holders, whether those announcements are governance concerns, messaging around airdrops, or other DAO-related updates.

#### Tokens as subscriptions

Wallet apps are obvious candidates for token dialect clients: a user's list of owned tokens becomes their list of message threads with the mint authorities.

This is a specific use case, but it gets at a broader design consideration with blockchain messaging: tokens serve as a natural, web3-native subscription mechanism. This has broad design implications, including for both engineering and spam. Both of these cases are discussed in more detail in the Performance and Inbound sections below.

### Other dialects

To do.

## Data structures

### `Dialect`s

```rust
#[account]
#[derive(Default)]
pub struct DialectAccount {
    pub encrypted: bool,
    pub message_idx: u8,
    pub message_account_idx: Option<u32>,
    pub members: [Member; 8],
    pub num_messages: u8,
    pub messages: [Message; num_messages],
    pub commission_mint: Option<TokenMint>,
    pub commission_recipient: Option<Pubkey>,
    pub commission_amount: Option<u64>,
}
```

A developer creating a dialect must simply specify the type, resources & configuration:

```typescript
const dialectAccount = await createDialect(
    program,
    [resource0, resource1, ...],
    {
        encrypted: ...,

    });
```


Let's discuss what each of the configuration attributes means.

#### Messages & message permanence

The number of messages in a DialectAccount is determined at its creation, and is finite. Users creating dialects have two options for message permanence:

1. Only the `DialectAccount` is used for storing messages, and therefore the total number of persisted messages is the `num_messages` length of the `messages` array. New messages eventually overwrite old ones. In this case, the `message_account_idx` is `None`.
2. `MessagesAccount`s are appended to the root `DialectAccount` as the `messages` arrays are successively filled, preserving the full message history. When the `messages` array on the `DialectAccount` is filled, a new `MessagesAccount` is created, and when it's array is filled, another is created. And so on.

In the latter case, the index of the most recent message account is stored in the `message_account_idx`. Whether option one or two above has been chosen is therefore determined by the existence of the `message_account_idx` attribute on the `DialectAccount`.

Note that we use indexes rather than linked lists for efficiently querying for batches of messages from `MessageAccount`s. Each `MessageAccount` is a PDA whose seeds are the `DialectAccount`'s address, a `"message_account"` marker, and the index of the `MessageAccount`. To query for the last `N` messages in a dialect, the client would simply have to first query for the dialect account, and then use the `message_account_idx`, together with the `num_messages`, to determine a batch call for `MessageAccount`s and their contents.

```typescript
async const getMessages = (program: anchor.Program, dialectAccount: DialectAccount, numTotalMessages: number): Promise<Message[]> => {
    const messageIdx = dialectAccount.dialect.message_idx;
    const messagesPerAcct = dialectAccount.dialect.
    if (message_account_idx === undefined) {
        // no messages accounts, all messages are in 
        ...
        return messages
    }
    // Messages accounts exist, create batch call to query for numTotalMessages most recent messages
    const message_account_idx_max = Math.ceil(message_idx / num_messages);
    const message_account_idx_min = message_account_idx_max - Math.ceil(numMessages / num_messages)
    const messageAccountAddresses = await Promise.all(anchor.web3.PublicKey.findProgramAddress())
    ...
    // Single, batch RPC call for multiple accounts
    const messageAccounts = await program.accounts.messageAccount.fetchMultiple(addresses);
    ...
    return messages;
}
```

As a result, only 2 non-parallelized RPC calls need to be made to query for messages from any dialect. And of course developers integrating dialect's client need only call the `getMessages` function.

```typescript
const messages = await getMessages(program, dialectAccount, numMessages);
```

Option 1 above is likely ideal for most use cases, given the impermanent nature of most messaging. The cost-benefit tradeoffs between these options are explained in more detail in the Data Permanence section.

### `MessageAccount`s

```rust
#[account]
#[derive(Default)]
pub struct MessageAccount {
    pub dialect: Pubkey,
    pub idx: u32,
    pub messages: [Message; num_messages],
}
```

### `Member`s

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct Member {
    pub pubkey: Pubkey,
    // [Admin, Write]. [false, false] implies read-only
    pub scopes: [bool; 2],
}
```

#### Authorization & scopes

Authorization & scopes are stored in the Member account, and are implicitly indexed. Scopes currently include:

1. `Admin` – Can add and remove members, amd change other aspects of the dialect's configuration.
2. `Write` – Can post messages.

The `Read` scope is assumed implicitly by membership in the dialect. More scopes may be added over time. Only the `owner`, who is an attribute of the account, and not a scope per se, can delete the dialect and recover its rent.

`Admin` does not imply `Write`. This is more of a UX design consideration than a security issue, since `Admin` users may grant themselves `Write` privileges at any time. Some dialects serve as one-way notification threads, for e.g. the owner to receive message notifications from a dapp. The implementing client may interpret an absent `Write` scope to mean that no text input field should be added to the view, giving the UX a design more in line with the one-way nature of the dialect.

In the future NFTs may serve as a more natural mechanism for defining member scopes. Holding an NFT would grant the holder its scopes.

#### Adding & removing members

To do.

### `Message`s

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Copy)]
pub struct Text(pub [u8; 256]);

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct Message {
    pub sender: Pubkey,
    pub timestamp: u64,
    pub text: Text,
}
```

#### Sending messages

Sending messages is simple.

```typescript
const message = await sendMessage(program, dialectAccount, text);
```

Authorization and scopes are enforced on chain; the function will error if the sender is not a member of the group, or does not have the `Write` privilege.

#### Message encryption

Not all dialects need to be encrypted, but one-on-one and group chats between wallets may choose to. In these cases, Dialect uses the multi-party Diffie-Hellman key exchange for a finite cyclic group. Conceptually, this technique allows any member of a group of N private/public keypair holders to deterministically derive a shared (symmetric) secret key for the group, which is then used for encrypting and decrypting messages. This key never needs to be sent between members; each member can derive it independently.

Whether or not a dialect is encrypted is denoted by the `encrypted` attribute.

Note that encryption can only be enforced on the client, not on chain. This means that a dialect's `encrypted` attribute is merely prescriptive for the implementing client, and cannot be checked by the protocol. Users must take care to ensure the clients they are using have not incorrectly implemented encryption, whether intentionally or unintentionally.

## Cost

At the time of this writing, network transaction fees on Solana are about $0.001. Every write action, whether creating a dialect or sending a message, has this cost. For comparison, sending a text via Twilio costs aound $0.01.

Dialect itself may likely charge a base commission for all messages sent via its protocol, as a means for revenue, but this is not currently reflected in this document.

Dialect owners may also specify an additional `commission` for sending messages, a non-recoverable cost that senders must pay to post messages to the dialect. This feature is optional. Its motivation is described in more detail in the Economics, inbound & spam section below.

All other costs, such as the necessary rent to allocate `Dialect` and `Message` accounts, is impermanent and retrievable. Dialect allows its owners to destroy dialects and recover their rent.

### Updating & deleting messages

To do.

## Users, & tracking subscriptions

A pub-sub messaging design requires its participants to track their subscriptions, since this information is not guaranteed to be implicitly discoverable.

In some cases, the product implementing dialect's client may have context on the subscriptions to look for. For example, a dapp that has integrated notifications into its product would be able to determine the dialect PDA address from the connected user's public key, and an additional resource

For all other cases, Dialect's default behavior is to allow users to store subscription information in a user account PDA.

### Profile

```rust
#[account]
#[derive(Default)]
pub struct UserAccount {
    pub subscriptions: [Subscription; num_dialects],
}
```

## Performance & query efficiency

- dapps make it easy
- user profile can store a list of dialects for efficient global query

## Economics, inbound, & spam

## Privacy

## Extending & composing dialects

---

## Web3 client



## Notification service

### API

### UI
