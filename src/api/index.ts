import * as anchor from '@project-serum/anchor';
import { EventParser } from '@project-serum/anchor';
import type { Wallet } from '@project-serum/anchor';
import type { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { sleep, waitForFinality, Wallet_ } from '../utils';
import { ENCRYPTION_OVERHEAD_BYTES } from '../utils/ecdh-encryption';
import { CyclicByteBuffer } from '../utils/cyclic-bytebuffer';
import ByteBuffer from 'bytebuffer';
import { EncryptionProps, TextSerdeFactory } from './text-serde';

// TODO: Switch from types to classes

/*
User metadata
*/
// TODO: Remove device token consts here
export const DEVICE_TOKEN_LENGTH = 64;
export const DEVICE_TOKEN_PAYLOAD_LENGTH = 128;
export const DEVICE_TOKEN_PADDING_LENGTH =
  DEVICE_TOKEN_PAYLOAD_LENGTH - DEVICE_TOKEN_LENGTH - ENCRYPTION_OVERHEAD_BYTES;

const ACCOUNT_DESCRIPTOR_SIZE = 8;
const DIALECT_ACCOUNT_MEMBER_SIZE = 34;
const DIALECT_ACCOUNT_MEMBER0_OFFSET = ACCOUNT_DESCRIPTOR_SIZE;
const DIALECT_ACCOUNT_MEMBER1_OFFSET =
  DIALECT_ACCOUNT_MEMBER0_OFFSET + DIALECT_ACCOUNT_MEMBER_SIZE;

export type Subscription = {
  pubkey: PublicKey;
  enabled: boolean;
};

type RawDialect = {
  members: Member[];
  messages: RawCyclicByteBuffer;
  lastMessageTimestamp: number;
  encrypted: boolean;
};

type RawCyclicByteBuffer = {
  readOffset: number;
  writeOffset: number;
  itemsCount: number;
  buffer: Uint8Array;
};

export type Metadata = {
  subscriptions: Subscription[];
};

export type DialectAccount = {
  dialect: Dialect;
  publicKey: PublicKey;
};

export type Dialect = {
  members: Member[];
  messages: Message[];
  nextMessageIdx: number;
  lastMessageTimestamp: number;
  encrypted: boolean;
};

export type Message = {
  owner: PublicKey;
  text: string;
  timestamp: number;
};

export type FindDialectQuery = {
  userPk?: anchor.web3.PublicKey;
};

export function isDialectAdmin(
  dialect: DialectAccount,
  user: anchor.web3.PublicKey,
): boolean {
  return dialect.dialect.members.some(
    (m) => m.publicKey.equals(user) && m.scopes[0],
  );
}

export async function accountInfoGet(
  connection: Connection,
  publicKey: PublicKey,
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await connection.getAccountInfo(publicKey);
}

export async function accountInfoFetch(
  _url: string,
  connection: Connection,
  publicKeyStr: string,
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  const publicKey = new anchor.web3.PublicKey(publicKeyStr);
  return await accountInfoGet(connection, publicKey);
}

export function ownerFetcher(
  _url: string,
  wallet: Wallet_,
  connection: Connection,
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return accountInfoGet(connection, wallet.publicKey);
}

export async function getMetadataProgramAddress(
  program: anchor.Program,
  user: PublicKey,
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('metadata'), user.toBuffer()],
    program.programId,
  );
}

// TODO: Simplify this function further now that we're no longer decrypting the device token.
export async function getMetadata(
  program: anchor.Program,
  user: PublicKey | anchor.web3.Keypair,
  otherParty?: PublicKey | anchor.web3.Keypair | null,
): Promise<Metadata> {
  let shouldDecrypt = false;
  let userIsKeypair = false;
  let otherPartyIsKeypair = false;

  try {
    // assume user is pubkey
    new anchor.web3.PublicKey(user.toString());
  } catch {
    // user is keypair
    userIsKeypair = true;
  }

  try {
    // assume otherParty is pubkey
    new anchor.web3.PublicKey(otherParty?.toString() || '');
  } catch {
    // otherParty is keypair or null
    otherPartyIsKeypair = (otherParty && true) || false;
  }

  if (otherParty && (userIsKeypair || otherPartyIsKeypair)) {
    // cases 3 - 5
    shouldDecrypt = true;
  }

  const [metadataAddress] = await getMetadataProgramAddress(
    program,
    userIsKeypair ? (user as Keypair).publicKey : (user as PublicKey),
  );
  const metadata = await program.account.metadataAccount.fetch(metadataAddress);

  // TODO RM this code chunk and change function signature
  return {
    subscriptions: metadata.subscriptions.filter(
      (s: Subscription) => !s.pubkey.equals(anchor.web3.PublicKey.default),
    ),
  };
}

export async function createMetadata(
  program: anchor.Program,
  user: anchor.web3.Keypair | Wallet,
): Promise<Metadata> {
  const [metadataAddress, metadataNonce] = await getMetadataProgramAddress(
    program,
    user.publicKey,
  );
  const tx = await program.rpc.createMetadata(new anchor.BN(metadataNonce), {
    accounts: {
      user: user.publicKey,
      metadata: metadataAddress,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: 'secretKey' in user ? [user] : [],
  });
  await waitForFinality(program, tx);
  return await getMetadata(program, user.publicKey);
}

export async function deleteMetadata(
  program: anchor.Program,
  user: anchor.web3.Keypair | Wallet,
): Promise<void> {
  const [metadataAddress, metadataNonce] = await getMetadataProgramAddress(
    program,
    user.publicKey,
  );
  await program.rpc.closeMetadata(new anchor.BN(metadataNonce), {
    accounts: {
      user: user.publicKey,
      metadata: metadataAddress,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: 'secretKey' in user ? [user] : [],
  });
}

export async function subscribeUser(
  program: anchor.Program,
  dialect: DialectAccount,
  user: PublicKey,
  signer: Keypair,
): Promise<Metadata> {
  const [publicKey, nonce] = await getDialectProgramAddress(
    program,
    dialect.dialect.members,
  );
  const [metadata, metadataNonce] = await getMetadataProgramAddress(
    program,
    user,
  );
  const tx = await program.rpc.subscribeUser(
    new anchor.BN(nonce),
    new anchor.BN(metadataNonce),
    {
      accounts: {
        dialect: publicKey,
        signer: signer.publicKey,
        user: user,
        metadata,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [signer],
    },
  );
  await waitForFinality(program, tx);
  return await getMetadata(program, user);
}

/*
Dialect
*/

export async function getDialectProgramAddress(
  program: anchor.Program,
  members: Member[],
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('dialect'),
      ...members // sort for deterministic PDA
        .map((m) => m.publicKey.toBuffer())
        .sort((a, b) => a.compare(b)), // TODO: test that buffers sort as expected
    ],
    program.programId,
  );
}

function parseMessages(
  { messages: rawMessagesBuffer, members, encrypted }: RawDialect,
  encryptionProps?: EncryptionProps,
) {
  if (encrypted && !encryptionProps) {
    return [];
  }
  const messagesBuffer = new CyclicByteBuffer(
    rawMessagesBuffer.readOffset,
    rawMessagesBuffer.writeOffset,
    rawMessagesBuffer.itemsCount,
    rawMessagesBuffer.buffer,
  );
  const textSerde = TextSerdeFactory.create(
    {
      encrypted,
      members,
    },
    encryptionProps,
  );
  const allMessages: Message[] = messagesBuffer.items().map(({ buffer }) => {
    const byteBuffer = new ByteBuffer(buffer.length).append(buffer).flip();
    const ownerMemberIndex = byteBuffer.readByte();
    const messageOwner = members[ownerMemberIndex];
    const timestamp = byteBuffer.readUint32() * 1000;
    const serializedText = new Uint8Array(byteBuffer.toBuffer(true));
    const text = textSerde.deserialize(serializedText);
    return {
      owner: messageOwner.publicKey,
      text,
      timestamp: timestamp,
    };
  });
  return allMessages.reverse();
}

function parseRawDialect(
  rawDialect: RawDialect,
  encryptionProps?: EncryptionProps,
) {
  return {
    encrypted: rawDialect.encrypted,
    members: rawDialect.members,
    nextMessageIdx: rawDialect.messages.writeOffset,
    lastMessageTimestamp: rawDialect.lastMessageTimestamp * 1000,
    messages: parseMessages(rawDialect, encryptionProps),
  };
}

export async function getDialect(
  program: anchor.Program,
  publicKey: PublicKey,
  encryptionProps?: EncryptionProps,
): Promise<DialectAccount> {
  const rawDialect = (await program.account.dialectAccount.fetch(
    publicKey,
  )) as RawDialect;
  const account = await program.provider.connection.getAccountInfo(publicKey);
  const dialect = parseRawDialect(rawDialect, encryptionProps);
  return {
    ...account,
    publicKey: publicKey,
    dialect,
  } as DialectAccount;
}

export async function getDialects(
  program: anchor.Program,
  user: anchor.web3.Keypair | Wallet,
  encryptionProps?: EncryptionProps,
): Promise<DialectAccount[]> {
  const metadata = await getMetadata(program, user.publicKey);
  const enabledSubscriptions = metadata.subscriptions.filter(
    (it) => it.enabled,
  );
  return Promise.all(
    enabledSubscriptions.map(async ({ pubkey }) =>
      getDialect(program, pubkey, encryptionProps),
    ),
  ).then((dialects) =>
    dialects.sort(
      ({ dialect: d1 }, { dialect: d2 }) =>
        d2.lastMessageTimestamp - d1.lastMessageTimestamp,
    ),
  );
}

export async function getDialectForMembers(
  program: anchor.Program,
  members: Member[],
  encryptionProps?: EncryptionProps,
): Promise<DialectAccount> {
  const sortedMembers = members.sort((a, b) =>
    a.publicKey.toBuffer().compare(b.publicKey.toBuffer()),
  );
  const [publicKey] = await getDialectProgramAddress(program, sortedMembers);
  return await getDialect(program, publicKey, encryptionProps);
}

export async function findDialects(
  program: anchor.Program,
  { userPk }: FindDialectQuery,
): Promise<DialectAccount[]> {
  const memberFilters = userPk
    ? [
        {
          memcmp: {
            offset: DIALECT_ACCOUNT_MEMBER0_OFFSET,
            bytes: userPk.toBase58(),
          },
        },
        {
          memcmp: {
            offset: DIALECT_ACCOUNT_MEMBER1_OFFSET,
            bytes: userPk.toBase58(),
          },
        },
      ]
    : [];
  return Promise.all(
    memberFilters.map((it) => program.account.dialectAccount.all([it])),
  )
    .then((it) =>
      it.flat().map((a) => {
        const rawDialect = a.account as RawDialect;
        const dialectAccount: DialectAccount = {
          publicKey: a.publicKey,
          dialect: parseRawDialect(rawDialect),
        };
        return dialectAccount;
      }),
    )
    .then((dialects) =>
      dialects.sort(
        ({ dialect: d1 }, { dialect: d2 }) =>
          d2.lastMessageTimestamp - d1.lastMessageTimestamp, // descending
      ),
    );
}

export async function createDialect(
  program: anchor.Program,
  owner: anchor.web3.Keypair | Wallet,
  members: Member[],
  encrypted = false,
  encryptionProps?: EncryptionProps,
): Promise<DialectAccount> {
  const sortedMembers = members.sort((a, b) =>
    a.publicKey.toBuffer().compare(b.publicKey.toBuffer()),
  );
  const [publicKey, nonce] = await getDialectProgramAddress(
    program,
    sortedMembers,
  );
  // TODO: assert owner in members
  const keyedMembers = sortedMembers.reduce(
    (ms, m, idx) => ({ ...ms, [`member${idx}`]: m.publicKey }),
    {},
  );
  const tx = await program.rpc.createDialect(
    new anchor.BN(nonce),
    encrypted,
    sortedMembers.map((m) => m.scopes),
    {
      accounts: {
        dialect: publicKey,
        owner: owner.publicKey,
        ...keyedMembers,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: 'secretKey' in owner ? [owner] : [],
    },
  );
  await waitForFinality(program, tx);
  return await getDialectForMembers(program, members, encryptionProps);
}

export async function deleteDialect(
  program: anchor.Program,
  { dialect }: DialectAccount,
  owner: anchor.web3.Keypair | Wallet,
): Promise<void> {
  const [dialectPublicKey, nonce] = await getDialectProgramAddress(
    program,
    dialect.members,
  );
  await program.rpc.closeDialect(new anchor.BN(nonce), {
    accounts: {
      dialect: dialectPublicKey,
      owner: owner.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: 'secretKey' in owner ? [owner] : [],
  });
}

/*
Members
*/

export type Member = {
  publicKey: anchor.web3.PublicKey;
  scopes: [boolean, boolean];
};

/*
Messages
*/

export async function sendMessage(
  program: anchor.Program,
  { dialect, publicKey }: DialectAccount,
  sender: anchor.web3.Keypair | Wallet,
  text: string,
  encryptionProps?: EncryptionProps,
): Promise<Message> {
  const [dialectPublicKey, nonce] = await getDialectProgramAddress(
    program,
    dialect.members,
  );
  const textSerde = TextSerdeFactory.create(
    {
      encrypted: dialect.encrypted,
      members: dialect.members,
    },
    encryptionProps,
  );
  const serializedText = textSerde.serialize(text);
  await program.rpc.sendMessage(
    new anchor.BN(nonce),
    Buffer.from(serializedText),
    {
      accounts: {
        dialect: dialectPublicKey,
        sender: sender ? sender.publicKey : program.provider.wallet.publicKey,
        member0: dialect.members[0].publicKey,
        member1: dialect.members[1].publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: sender && 'secretKey' in sender ? [sender] : [],
    },
  );
  const d = await getDialect(program, publicKey, encryptionProps);
  return d.dialect.messages[0]; // TODO: Support ring
}

// Events
// An event is something that has happened in the past
export type Event =
  | DialectCreatedEvent
  | DialectDeletedEvent
  | MetadataCreatedEvent
  | MetadataDeletedEvent
  | MessageSentEvent
  | UserSubscribedEvent;

export interface DialectCreatedEvent {
  type: 'dialect-created';
  dialect: PublicKey;
  members: PublicKey[];
}

export interface DialectDeletedEvent {
  type: 'dialect-deleted';
  dialect: PublicKey;
  members: PublicKey[];
}

export interface MetadataCreatedEvent {
  type: 'metadata-created';
  metadata: PublicKey;
  user: PublicKey;
}

export interface MetadataDeletedEvent {
  type: 'metadata-deleted';
  metadata: PublicKey;
  user: PublicKey;
}

export interface MessageSentEvent {
  type: 'message-sent';
  dialect: PublicKey;
  sender: PublicKey;
}

export interface UserSubscribedEvent {
  type: 'user-subscribed';
  metadata: PublicKey;
  dialect: PublicKey;
}

export type EventHandler = (event: Event) => Promise<any>;

export interface EventSubscription {
  unsubscribe(): Promise<any>;
}

class DefaultSubscription implements EventSubscription {
  private readonly eventParser: EventParser;
  private isInterrupted = false;
  private subscriptionId?: number;

  constructor(
    private readonly program: anchor.Program,
    private readonly eventHandler: EventHandler,
  ) {
    this.eventParser = new EventParser(program.programId, program.coder);
  }

  async start(): Promise<EventSubscription> {
    this.periodicallyReconnect();
    return this;
  }

  async reconnectSubscriptions() {
    await this.unsubscribeFromLogsIfSubscribed();
    this.subscriptionId = this.program.provider.connection.onLogs(
      this.program.programId,
      async (logs) => {
        if (logs.err) {
          console.error(logs);
          return;
        }
        this.eventParser.parseLogs(logs.logs, (event) => {
          if (!this.isInterrupted) {
            switch (event.name) {
              case 'DialectCreatedEvent':
                this.eventHandler({
                  type: 'dialect-created',
                  dialect: event.data.dialect as PublicKey,
                  members: event.data.members as PublicKey[],
                });
                break;
              case 'DialectDeletedEvent':
                this.eventHandler({
                  type: 'dialect-deleted',
                  dialect: event.data.dialect as PublicKey,
                  members: event.data.members as PublicKey[],
                });
                break;
              case 'MessageSentEvent':
                this.eventHandler({
                  type: 'message-sent',
                  dialect: event.data.dialect as PublicKey,
                  sender: event.data.sender as PublicKey,
                });
                break;
              case 'UserSubscribedEvent':
                this.eventHandler({
                  type: 'user-subscribed',
                  metadata: event.data.metadata as PublicKey,
                  dialect: event.data.dialect as PublicKey,
                });
                break;
              case 'MetadataCreatedEvent':
                this.eventHandler({
                  type: 'metadata-created',
                  metadata: event.data.metadata as PublicKey,
                  user: event.data.user as PublicKey,
                });
                break;
              case 'MetadataDeletedEvent':
                this.eventHandler({
                  type: 'metadata-deleted',
                  metadata: event.data.metadata as PublicKey,
                  user: event.data.user as PublicKey,
                });
                break;
              default:
                console.log('Unsupported event type', event.name);
            }
          }
        });
      },
    );
  }

  unsubscribe(): Promise<void> {
    this.isInterrupted = true;
    return this.unsubscribeFromLogsIfSubscribed();
  }

  private async periodicallyReconnect() {
    while (!this.isInterrupted) {
      await this.reconnectSubscriptions();
      await sleep(1000 * 60);
    }
  }

  private unsubscribeFromLogsIfSubscribed() {
    return this.subscriptionId
      ? this.program.provider.connection.removeOnLogsListener(
          this.subscriptionId,
        )
      : Promise.resolve();
  }
}

export async function subscribeToEvents(
  program: anchor.Program,
  eventHandler: EventHandler,
): Promise<EventSubscription> {
  return new DefaultSubscription(program, eventHandler).start();
}
