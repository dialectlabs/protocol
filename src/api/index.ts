import * as anchor from '@project-serum/anchor';
import { Wallet } from '@project-serum/anchor/src/provider';
import * as splToken from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { waitForFinality, Wallet_ } from '../utils';
import {
  ecdhEncrypt,
  ENCRYPTION_OVERHEAD_BYTES,
} from '../utils/ecdh-encryption';
import { generateRandomNonce } from '../utils/nonce-generator';
import { CyclicByteBuffer } from '../utils/cyclic-bytebuffer';
import ByteBuffer from 'bytebuffer';
import { TextSerdeFactory } from './text-serde'; // TODO: Switch from types to classes

// TODO: Switch from types to classes

/*
User metadata
*/
export const DEVICE_TOKEN_LENGTH = 64;
export const DEVICE_TOKEN_PAYLOAD_LENGTH = 128;
export const DEVICE_TOKEN_PADDING_LENGTH =
  DEVICE_TOKEN_PAYLOAD_LENGTH - DEVICE_TOKEN_LENGTH - ENCRYPTION_OVERHEAD_BYTES;

const ACCOUNT_DESCRIPTOR_SIZE = 8;
const DIALECT_ACCOUNT_MEMBER_SIZE = 34;
const DIALECT_ACCOUNT_MEMBER0_OFFSET = ACCOUNT_DESCRIPTOR_SIZE;
const DIALECT_ACCOUNT_MEMBER1_OFFSET =
  DIALECT_ACCOUNT_MEMBER0_OFFSET + DIALECT_ACCOUNT_MEMBER_SIZE;

type Subscription = {
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

type Message = {
  owner: PublicKey;
  text: string;
  timestamp: number;
};

export type FindDialectQuery = {
  userPk?: anchor.web3.PublicKey;
};

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
  user: Keypair,
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
    signers: [user],
  });
  await waitForFinality(program, tx);
  return await getMetadata(program, user.publicKey);
}

export async function deleteMetadata(
  program: anchor.Program,
  user: Keypair,
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
    signers: [user],
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
  user?: anchor.web3.Keypair,
) {
  if (encrypted && !user) {
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
    user,
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

function parseRawDialect(rawDialect: RawDialect, user?: anchor.web3.Keypair) {
  return {
    encrypted: rawDialect.encrypted,
    members: rawDialect.members,
    nextMessageIdx: rawDialect.messages.writeOffset,
    lastMessageTimestamp: rawDialect.lastMessageTimestamp * 1000,
    messages: parseMessages(rawDialect, user),
  };
}

export async function getDialect(
  program: anchor.Program,
  publicKey: PublicKey,
  user?: anchor.web3.Keypair,
): Promise<DialectAccount> {
  const rawDialect = (await program.account.dialectAccount.fetch(
    publicKey,
  )) as RawDialect;
  const account = await program.provider.connection.getAccountInfo(publicKey);
  const dialect = parseRawDialect(rawDialect, user);
  return {
    ...account,
    publicKey: publicKey,
    dialect,
  } as DialectAccount;
}

export async function getDialects(
  program: anchor.Program,
  user: anchor.web3.Keypair,
): Promise<DialectAccount[]> {
  const metadata = await getMetadata(program, user.publicKey);
  const enabledSubscriptions = metadata.subscriptions.filter(
    (it) => it.enabled,
  );
  return Promise.all(
    enabledSubscriptions.map(async ({ pubkey }) =>
      getDialect(program, pubkey, user),
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
  user?: anchor.web3.Keypair,
): Promise<DialectAccount> {
  const sortedMembers = members.sort((a, b) =>
    a.publicKey.toBuffer().compare(b.publicKey.toBuffer()),
  );
  const [publicKey] = await getDialectProgramAddress(program, sortedMembers);
  return await getDialect(program, publicKey, user);
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
  ).then((it) =>
    it.flat().map((a) => {
      const rawDialect = a.account as RawDialect;
      const dialectAccount: DialectAccount = {
        publicKey: a.publicKey,
        dialect: parseRawDialect(rawDialect),
      };
      return dialectAccount;
    }),
  );
}

export async function createDialect(
  program: anchor.Program,
  owner: anchor.web3.Keypair | Wallet,
  members: Member[],
  encrypted = true,
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
  return await getDialectForMembers(program, members, 'secretKey' in owner ? owner : undefined);
}

export async function deleteDialect(
  program: anchor.Program,
  { dialect }: DialectAccount,
  owner: anchor.web3.Keypair,
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
    signers: [owner],
  });
}

/*
Mint Dialect
*/

type MintDialect = {
  mint: PublicKey;
};

type MintDialectAccount = anchor.web3.AccountInfo<Buffer> & {
  dialect: MintDialect;
  publicKey: PublicKey;
};

export async function getMintDialectProgramAddress(
  program: anchor.Program,
  mint: splToken.Token,
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('dialect'), mint.publicKey.toBuffer()],
    program.programId,
  );
}

export async function getMintDialect(
  program: anchor.Program,
  mint: splToken.Token,
): Promise<MintDialectAccount> {
  const [publicKey] = await getMintDialectProgramAddress(program, mint);
  const dialect = await program.account.mintDialectAccount.fetch(publicKey);
  const account = await program.provider.connection.getAccountInfo(publicKey);
  return {
    ...account,
    publicKey,
    dialect,
  } as MintDialectAccount;
}

export async function createMintDialect(
  program: anchor.Program,
  mint: splToken.Token,
  mintAuthority: anchor.web3.Keypair,
): Promise<MintDialectAccount> {
  const [publicKey, nonce] = await getMintDialectProgramAddress(program, mint);
  const tx = await program.rpc.createMintDialect(new anchor.BN(nonce), {
    accounts: {
      dialect: publicKey,
      mint: mint.publicKey,
      mintAuthority: mintAuthority.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [mintAuthority],
  });
  await waitForFinality(program, tx);
  return await getMintDialect(program, mint);
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
  sender: anchor.web3.Keypair,
  text: string,
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
    sender,
  );
  const serializedText = textSerde.serialize(text);
  await program.rpc.sendMessage(
    new anchor.BN(nonce),
    Buffer.from(serializedText),
    {
      accounts: {
        dialect: dialectPublicKey,
        sender: sender.publicKey,
        member0: dialect.members[0].publicKey,
        member1: dialect.members[1].publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [sender],
    },
  );
  const d = await getDialect(program, publicKey, sender);
  return d.dialect.messages[d.dialect.nextMessageIdx - 1]; // TODO: Support ring
}
