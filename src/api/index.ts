import * as anchor from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { deviceTokenIsPresent, waitForFinality, Wallet_ } from '../utils';
import {
  ecdhDecrypt,
  ecdhEncrypt,
  ENCRYPTION_OVERHEAD_BYTES,
} from '../utils/ecdh-encryption';
import { deserializeText, serializeText } from '../utils/text-serde';
import { generateNonce, generateRandomNonce } from '../utils/nonce-generator'; // TODO: Switch from types to classes

// TODO: Switch from types to classes

/*
User metadata
*/

export const MESSAGES_PER_DIALECT = 32;
export const MAX_RAW_MESSAGE_SIZE = 256;
export const MAX_MESSAGE_SIZE =
  MAX_RAW_MESSAGE_SIZE - ENCRYPTION_OVERHEAD_BYTES;
export const DEVICE_TOKEN_LENGTH = 64;
export const DEVICE_TOKEN_PAYLOAD_LENGTH = 128;
export const DEVICE_TOKEN_PADDING_LENGTH = DEVICE_TOKEN_PAYLOAD_LENGTH - DEVICE_TOKEN_LENGTH - ENCRYPTION_OVERHEAD_BYTES;

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
  messages: RawMessage[];
  nextMessageIdx: number;
  lastMessageTimestamp: number;
};

type RawMessage = {
  owner: PublicKey;
  text: number[];
  timestamp: number;
};

export type Metadata = {
  deviceToken: string | null;
  subscriptions: Subscription[];
};

export type DialectAccount = anchor.web3.AccountInfo<Buffer> & {
  dialect: Dialect;
  publicKey: PublicKey;
};

export type Dialect = {
  members: Member[];
  messages: Message[];
  nextMessageIdx: number;
  lastMessageTimestamp: number;
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

export async function getMetadata(
  program: anchor.Program,
  user: PublicKey | anchor.web3.Keypair,
  otherParty?: PublicKey | anchor.web3.Keypair | null,
): Promise<Metadata> {
  /*
  6 scenarios:

  0. User is keypair, otherParty is null -- Cannot decrypt
  1. User is public key, otherParty is null -- Cannot decrypt
  2. User is public key, otherParty is public key -- Cannot decrypt
  3. User is public key, otherParty is keypair -- Can decrypt
  4. User is keypair, otherParty is public key -- Can decrypt
  5. User is keypair, otherParty is keypair -- Can decrypt
  */
  let shouldDecrypt = false;
  let userIsKeypair = false;
  let otherPartyIsKeypair = false;
  let pubkeyToUse: anchor.web3.PublicKey | null = null;
  let keypairToUse: anchor.web3.Keypair | null = null;

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
    otherPartyIsKeypair = otherParty && true || false;
  }

  if (otherParty && (userIsKeypair || otherPartyIsKeypair)) { // cases 3 - 5
    shouldDecrypt = true;
  }

  if (shouldDecrypt) { // we know we have a keypair, now we just prioritize which we use
    keypairToUse = (userIsKeypair ? user : otherParty) as anchor.web3.Keypair;
    // if both keypairs, use user keypair & other party public key
    pubkeyToUse = userIsKeypair && otherPartyIsKeypair ? ((otherParty as Keypair).publicKey) // both keypairs, prioritize user keypair
      : userIsKeypair ? otherParty as PublicKey  // user is keypair, other party is pubkey
      : user as PublicKey; // user is pubkey, other party is keypair
  }
  const [metadataAddress] = await getMetadataProgramAddress(program, userIsKeypair ? (user as Keypair).publicKey : user as PublicKey);
  const metadata = await program.account.metadataAccount.fetch(metadataAddress);

  let deviceToken: string | null = null;
  if (shouldDecrypt && deviceTokenIsPresent(metadata.deviceToken)) {
    try {
      const decryptedDeviceToken = ecdhDecrypt(
        new Uint8Array(metadata.deviceToken.encryptedArray),
        {
          secretKey: (keypairToUse as Keypair).secretKey,
          publicKey: (keypairToUse as Keypair).publicKey.toBytes(),
        },
        (pubkeyToUse as PublicKey).toBytes(),
        new Uint8Array(metadata.deviceToken.nonce),
      );
      deviceToken = new TextDecoder().decode(decryptedDeviceToken);
    } catch (e) {
      console.log('FAILED TO DECRYPT DEVICE TOKEN', metadata.deviceToken, e);
    }
  }
  return {
    deviceToken,
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

export async function updateDeviceToken(
  program: anchor.Program,
  user: Keypair,
  otherPartyPubkey: PublicKey,
  deviceToken: string | null,
): Promise<Metadata> {
  const [metadataAddress, metadataNonce] = await getMetadataProgramAddress(
    program,
    user.publicKey,
  );
  let encryptedDeviceToken: Uint8Array | null = null;
  const nonce = generateRandomNonce();
  if (deviceToken) {
    const unpaddedDeviceToken = ecdhEncrypt(
      new Uint8Array(Buffer.from(deviceToken)),
      {
        publicKey: user.publicKey.toBytes(),
        secretKey: user.secretKey,
      },
      otherPartyPubkey.toBytes(),
      nonce,
    );
    // TODO: Retire this padding
    const padding = new Uint8Array(new Array(DEVICE_TOKEN_PADDING_LENGTH).fill(0));
    encryptedDeviceToken = new Uint8Array([...unpaddedDeviceToken, ...padding]);
  }
  const tx = await program.rpc.updateDeviceToken(
    new anchor.BN(metadataNonce),
    encryptedDeviceToken ? Buffer.from(encryptedDeviceToken) : null,
    nonce,
    {
      accounts: {
        user: user.publicKey,
        metadata: metadataAddress,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [user],
    },
  );
  await waitForFinality(program, tx);
  return await getMetadata(program, user, otherPartyPubkey);
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

function findOtherMember(allMembers: Member[], me: anchor.web3.Keypair) {
  const otherMember = allMembers.find(
    (it) => !it.publicKey.equals(me.publicKey),
  );
  if (!otherMember) {
    throw new Error('Expected to have other member');
  }
  return otherMember;
}

function decryptMessage(
  message: RawMessage,
  messageIdx: number,
  user: anchor.web3.Keypair,
  otherMember: Member,
): Message {
  const encryptedText = new Uint8Array(message.text);
  const messageNonce = generateNonce(messageIdx);
  const decryptedText = ecdhDecrypt(
    encryptedText,
    {
      secretKey: user.secretKey,
      publicKey: user.publicKey.toBytes(),
    },
    otherMember.publicKey.toBytes(),
    messageNonce,
  );
  const text = deserializeText(decryptedText);
  return {
    ...message,
    text,
  };
}

function isPresent(message: RawMessage): boolean {
  return message.timestamp !== 0;
}

function getMessages(dialect: RawDialect, user: anchor.web3.Keypair) {
  const otherMember = findOtherMember(dialect.members, user);
  const decryptedMessages: Message[] = dialect.messages
    .filter((m: RawMessage) => isPresent(m))
    .map((m: RawMessage, idx) => decryptMessage(m, idx, user, otherMember));
  const permutedAndOrderedMessages: Message[] = [];
  for (let i = 0; i < decryptedMessages.length; i++) {
    const idx =
      (dialect.nextMessageIdx - 1 - i) % MESSAGES_PER_DIALECT >= 0
        ? (dialect.nextMessageIdx - 1 - i) % MESSAGES_PER_DIALECT
        : MESSAGES_PER_DIALECT + (dialect.nextMessageIdx - 1 - i); // lol is this right
    const m = decryptedMessages[idx];
    permutedAndOrderedMessages.push(m);
  }
  return permutedAndOrderedMessages.map((m: Message) => {
    return {
      ...m,
      timestamp: m.timestamp * 1000,
    };
  });
}

export async function getDialect(
  program: anchor.Program,
  publicKey: PublicKey,
  user?: anchor.web3.Keypair,
): Promise<DialectAccount> {
  const dialect = (await program.account.dialectAccount.fetch(
    publicKey,
  )) as RawDialect;
  const account = await program.provider.connection.getAccountInfo(publicKey);
  const messages = user ? getMessages(dialect, user) : [];
  return {
    ...account,
    publicKey: publicKey,
    // dialect,
    dialect: {
      ...dialect,
      lastMessageTimestamp: dialect.lastMessageTimestamp * 1000,
      messages,
    },
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
  ).then((it) => it.flat().map((a) => a as unknown as DialectAccount));
}

export async function createDialect(
  program: anchor.Program,
  owner: anchor.web3.Keypair,
  members: Member[],
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
    sortedMembers.map((m) => m.scopes),
    {
      accounts: {
        dialect: publicKey,
        owner: owner.publicKey,
        ...keyedMembers,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [owner],
    },
  );
  await waitForFinality(program, tx);
  return await getDialectForMembers(program, members, owner);
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
  const otherMember = findOtherMember(dialect.members, sender);
  const textBytes = serializeText(text, MAX_MESSAGE_SIZE);
  const textEncryptionNonce = generateNonce(dialect.nextMessageIdx);
  const encryptedText = ecdhEncrypt(
    textBytes,
    {
      secretKey: sender.secretKey,
      publicKey: sender.publicKey.toBytes(),
    },
    otherMember.publicKey.toBytes(),
    textEncryptionNonce,
  );
  await program.rpc.sendMessage(
    new anchor.BN(nonce),
    Buffer.from(encryptedText),
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
