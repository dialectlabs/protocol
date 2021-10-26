import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { sha256 } from 'js-sha256';
import { Wallet_, sleep } from '../utils';

// @ts-ignore
import ed2curve from 'ed2curve';
import nacl from 'tweetnacl';

// TODO: Ported from anchor. Use there.
// Calculates unique 8 byte discriminator prepended to all anchor accounts.
export async function accountDiscriminator(name: string): Promise<Buffer> {
  return Buffer.from(sha256.digest(`account:${name}`)).slice(0, 8);
}

export async function accountInfoGet(
  connection: Connection,
  publicKey: PublicKey
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await connection.getAccountInfo(publicKey);
}

export async function accountInfoFetch(
  _url: string,
  connection: Connection,
  publicKeyStr: string
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  const publicKey = new anchor.web3.PublicKey(publicKeyStr);
  return await accountInfoGet(connection, publicKey);
}

export async function ownerFetcher(
  _url: string,
  wallet: Wallet_,
  connection: Connection
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  const r = await accountInfoGet(connection, wallet.publicKey);
  return r;
}

export async function validMemberFetch(
  _url: string,
  program: anchor.Program,
  publicKeyStr: string
): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  const publicKey = new anchor.web3.PublicKey(publicKeyStr);
  let accountInfo: anchor.web3.AccountInfo<Buffer> | null = null;
  // try {
  accountInfo = await program.provider.connection.getAccountInfo(publicKey);
  if (!accountInfo) {
    throw new Error('Account not found');
  }

  const [settingsAccount] = await settingsProgramAddressGet(program, publicKey);
  const settingsAccountInfo = await program.provider.connection.getAccountInfo(
    settingsAccount
  );
  if (!settingsAccountInfo) {
    throw new Error('Account has not signed up');
  }
  return accountInfo;
}

/*
Watcher
*/
type WatcherData = {
  threads: SettingsThreadRef[];
};

export async function watcherProgramAddressGet(
  program: anchor.Program
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('watcher_account')],
    program.programId
  );
}

export async function watcherCreate(
  program: anchor.Program,
  owner?: anchor.web3.PublicKey
): Promise<void> {
  const [watcherpk, watcher_nonce] = await watcherProgramAddressGet(program);
  const tx = await program.rpc.createWatcherAccount(
    new anchor.BN(watcher_nonce),
    {
      accounts: {
        owner: owner || program.provider.wallet.publicKey,
        watcherAccount: watcherpk,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    }
  );
  await waitForFinality(program, tx);
}

export async function watcherThreadsGet(
  program: anchor.Program
): Promise<SettingsThreadRef[]> {
  const [watcherpk] = await watcherProgramAddressGet(program);
  const watcherDataObject = await program.account.watcherAccount.fetch(
    watcherpk
  );
  const watcherData = watcherDataObject as WatcherData;
  return watcherData.threads;
}

/*
Settings
*/

async function settingsProgramAddressGet(
  program: anchor.Program,
  publicKey: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [publicKey.toBuffer(), Buffer.from('settings_account')],
    program.programId
  );
}

type SettingsThreadRef = {
  key: PublicKey;
};

type SettingsData = {
  owner: PublicKey;
  threads: SettingsThreadRef[];
};

type SettingsAccount = anchor.web3.AccountInfo<Buffer> & {
  settings: SettingsData;
  publicKey: PublicKey;
};

export async function settingsGet(
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey
): Promise<SettingsAccount> {
  const [settingspk] = await settingsProgramAddressGet(program, publicKey);
  const data = await program.account.settingsAccount.fetch(settingspk);
  const account = await connection.getAccountInfo(settingspk);
  return {
    ...account,
    publicKey: settingspk,
    settings: data,
  } as SettingsAccount;
}

export async function settingsFetch(
  _url: string,
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey | string
): Promise<SettingsAccount> {
  if (typeof publicKey === 'string') {
    publicKey = new anchor.web3.PublicKey(publicKey);
  }
  return await settingsGet(program, connection, publicKey);
}

export async function settingsCreate(
  wallet: Wallet_,
  program: anchor.Program,
  owner?: anchor.web3.PublicKey | undefined,
  signers?: anchor.web3.Keypair[] | undefined,
  instructions?: anchor.web3.TransactionInstruction[] | undefined
): Promise<SettingsAccount> {
  const [publicKey, nonce] = await settingsProgramAddressGet(
    program,
    owner || wallet.publicKey
  );
  const tx = await program.rpc.createUserSettingsAccount(new anchor.BN(nonce), {
    accounts: {
      owner: owner || program.provider.wallet.publicKey,
      settingsAccount: publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers,
    instructions,
  });
  await waitForFinality(program, tx);
  const sett = await settingsGet(
    program,
    program.provider.connection,
    owner || wallet.publicKey
  );
  return sett;
}

export async function settingsMutate(
  _url: string,
  wallet: Wallet_,
  program: anchor.Program
): Promise<SettingsAccount> {
  return await settingsCreate(wallet, program);
}

/*
Threads
*/

type ThreadMember = {
  key: PublicKey;
};

type ThreadData = {
  owner: PublicKey;
  members: ThreadMember[];
  messageIdx: number;
};

export type ThreadAccount = anchor.web3.AccountInfo<Buffer> & {
  thread: ThreadData;
  publicKey: PublicKey;
};

export async function threadMutate(
  _url: string,
  program: anchor.Program,
  wallet: Wallet_
): Promise<ThreadAccount> {
  return await threadCreate(program, wallet);
}

export async function threadCreate(
  program: anchor.Program,
  wallet: Wallet_
): Promise<ThreadAccount> {
  const kp = anchor.web3.Keypair.generate();
  const [settingspk, settings_nonce] = await settingsProgramAddressGet(
    program,
    wallet.publicKey
  );
  const [watcherpk, watcher_nonce] = await watcherProgramAddressGet(program);
  const tx = await program.rpc.createThreadAccount(
    new anchor.BN(settings_nonce),
    new anchor.BN(watcher_nonce),
    {
      accounts: {
        owner: program.provider.wallet.publicKey,
        threadAccount: kp.publicKey,
        settingsAccount: settingspk,
        watcherAccount: watcherpk,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [kp],
    }
  );

  await waitForFinality(program, tx);
  return await threadGet(program, kp.publicKey);
}

export async function threadFetch(
  _url: string,
  program: anchor.Program,
  publicKey: PublicKey | string
): Promise<ThreadAccount> {
  if (typeof publicKey === 'string') {
    publicKey = new anchor.web3.PublicKey(publicKey);
  }
  return await threadGet(program, publicKey);
}

export async function threadGet(
  program: anchor.Program,
  publicKey: PublicKey
): Promise<ThreadAccount> {
  const data = await program.account.threadAccount.fetch(publicKey);
  const account = await program.provider.connection.getAccountInfo(publicKey);
  return { ...account, publicKey, thread: data } as ThreadAccount;
}

export async function threadsFetch(
  _url: string,
  program: anchor.Program,
  publicKeys: PublicKey[] | string[]
): Promise<ThreadAccount[]> {
  if (publicKeys.length < 1) return [];
  if (typeof publicKeys[0] === 'string') {
    publicKeys = publicKeys.map(
      (publicKey) => new anchor.web3.PublicKey(publicKey)
    );
  }
  return await threadsGet(program, publicKeys as PublicKey[]);
}

export async function threadsGet(
  program: anchor.Program,
  publicKeys: PublicKey[]
): Promise<ThreadAccount[]> {
  const accountInfos = await anchor.utils.rpc.getMultipleAccounts(
    program.provider.connection,
    publicKeys
  );
  const threadAccounts: ThreadAccount[] = [];
  const indexedMessageAccounts: {
    [key: string]: MessageAccount | number;
  }[] = [];
  await Promise.all(
    accountInfos.map(async (accountInfo, idx) => {
      // TODO: Code block ported from anchor. Use there.
      if (accountInfo === null) {
        throw new Error(`Account does not exist ${publicKeys[idx].toString()}`);
      }
      const discriminator = await accountDiscriminator('ThreadAccount');
      if (discriminator.compare(accountInfo.account.data.slice(0, 8))) {
        throw new Error('Invalid account discriminator');
      }

      const threadAccount = {
        ...accountInfo.account,
        publicKey: publicKeys[idx],
        thread: program.account.threadAccount.coder.accounts.decode(
          'ThreadAccount',
          accountInfo.account.data
        ),
      } as ThreadAccount;

      const latestMessages = await messagesGet(program, threadAccount, 1);
      if (latestMessages.length > 1) {
        threadAccounts.push(threadAccount);
        indexedMessageAccounts.push({ messageAccount: latestMessages[0], idx });
      }
    })
  );

  // Sort threads according to descending most recent message timestamps
  // TODO: don't do this here, do it in dialect instead
  const sortedMessageAccounts = indexedMessageAccounts.sort((a, b) => {
    const maa = a.messageAccount as MessageAccount;
    const mab = b.messageAccount as MessageAccount;
    return mab.message.timestamp.getTime() - maa.message.timestamp.getTime();
  });

  const sortedThreadAccounts: ThreadAccount[] = [];
  sortedMessageAccounts.forEach((sma, idx) => {
    sortedThreadAccounts.push(threadAccounts[idx]);
  });

  return sortedThreadAccounts;
}

export async function userThreadMutate(
  _url: string,
  program: anchor.Program,
  thread: PublicKey,
  invitee: PublicKey
): Promise<ThreadAccount> {
  return await addUserToThread(program, thread, invitee);
}

export async function addUserToThread(
  program: anchor.Program,
  thread: PublicKey,
  invitee: PublicKey,
  signers?: anchor.web3.Keypair[] | null,
  instructions?: anchor.web3.TransactionInstruction[] | null
): Promise<ThreadAccount> {
  const [publicKey, nonce] = await settingsProgramAddressGet(program, invitee);
  const tx = await program.rpc.addUserToThread(new anchor.BN(nonce), {
    accounts: {
      owner: program.provider.wallet.publicKey,
      invitee,
      threadAccount: thread,
      inviteeSettingsAccount: publicKey,
    },
    signers: signers || undefined,
    instructions: instructions || undefined,
  });
  await waitForFinality(program, tx);
  return await threadGet(program, thread);
}

/*
Messages
*/

type MessageData = {
  owner: PublicKey;
  text: string;
  idx: number;
  timestamp: Date;
};

type MessageAccount = anchor.web3.AccountInfo<Buffer> & {
  message: MessageData;
  publicKey: PublicKey;
};

export async function messageProgramAddressGet(
  program: anchor.Program,
  threadPubkey: PublicKey,
  messageIdx: string
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      threadPubkey.toBuffer(),
      Buffer.from('message_account'),
      Buffer.from(messageIdx),
    ],
    program.programId
  );
}

export async function messageMutate(
  _url: string,
  program: anchor.Program,
  thread: ThreadAccount | string,
  text: string,
  sender?: anchor.web3.Keypair | null
): Promise<MessageAccount[]> {
  if (typeof thread === 'string') {
    thread = await threadGet(program, new anchor.web3.PublicKey(thread));
  }
  return await messageCreate(program, thread, text, sender);
}

function getOtherPublicKey(members: ThreadMember[], key: PublicKey): PublicKey {
  return members.filter((member) => member.key !== key)[0].key;
}

function getMessageEncryptionNonce(messagepk: PublicKey): Uint8Array {
  return new Uint8Array(messagepk.toBuffer()).slice(0, 24);
}

const IN_NODE =
  typeof process !== 'undefined' &&
  process.release &&
  process.release.name === 'node';

export let base64Encode: (buffer: Uint8Array) => string;
export let base64Decode: (str: string) => Uint8Array;
if (IN_NODE) {
  base64Encode = function (buffer: Uint8Array): string {
    return Buffer.from(buffer).toString('base64');
  };
  base64Decode = function (str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'base64'));
  };
} else {
  base64Encode = function (buffer: Uint8Array): string {
    // @ts-ignore
    return btoa(String.fromCharCode.apply(null, buffer));
  };

  base64Decode = function (str: string): Uint8Array {
    return new Uint8Array(
      atob(str)
        .split('')
        .map(function (c) {
          return c.charCodeAt(0);
        })
    );
  };
}

export async function messageCreate(
  program: anchor.Program,
  thread: ThreadAccount,
  text: string,
  sender?: anchor.web3.Signer | null,
  encrypted = false
): Promise<MessageAccount[]> {
  const [messagepk, nonce] = await messageProgramAddressGet(
    program,
    thread.publicKey,
    (thread.thread.messageIdx + 1).toString()
  );

  let textBuffer = new TextEncoder().encode(text);
  if (encrypted) {
    if (thread.thread.members.length !== 2) {
      throw new Error('Can only encrypt messages in threads with two members.');
    }
    if (!sender) {
      throw new Error('Sender must be provided to encrypt messages.');
    }

    const targetPublicKey = getOtherPublicKey(
      thread.thread.members,
      sender.publicKey
    );
    // Encrypt message
    const encryptionNonce = getMessageEncryptionNonce(messagepk);
    textBuffer = encryptMessage(
      textBuffer,
      sender,
      targetPublicKey,
      encryptionNonce
    );
  }

  const text64Encoded = base64Encode(textBuffer);
  const tx = await program.rpc.addMessageToThread(
    new anchor.BN(nonce),
    text64Encoded,
    new anchor.BN(Date.now()),
    encrypted,
    {
      accounts: {
        sender: sender?.publicKey || program.provider.wallet.publicKey,
        messageAccount: messagepk,
        threadAccount: thread.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: sender ? [sender] : [],
    }
  );
  await waitForFinality(program, tx);
  const updatedThread = await threadGet(program, thread.publicKey);
  return await messagesGet(program, updatedThread, 1);
}

export async function messagesFetch(
  _url: string,
  program: anchor.Program,
  thread: ThreadAccount,
  batchSize?: number | undefined
): Promise<MessageAccount[]> {
  return await messagesGet(program, thread, batchSize);
}

export async function messagesGet(
  program: anchor.Program,
  thread: ThreadAccount,
  batchSize?: number | undefined,
  receiver?: anchor.web3.Keypair
): Promise<MessageAccount[]> {
  // TODO: Protect against invalid batch size
  if (!batchSize) {
    batchSize = 20;
  }
  const maxIdx = thread.thread.messageIdx;
  const minIdx = Math.max(maxIdx - batchSize, 1);
  const idxs = Array(maxIdx - minIdx + 1)
    .fill(null)
    .map((_, i) => minIdx + i);
  // TODO: Batch RPC calls
  const publicKeys = await Promise.all(
    idxs.map(async (idx) => {
      const [messagepk] = await messageProgramAddressGet(
        program,
        thread.publicKey,
        idx.toString()
      );
      return messagepk;
    })
  );
  const messageAccountInfos = await anchor.utils.rpc.getMultipleAccounts(
    program.provider.connection,
    publicKeys
  );
  const messages = await Promise.all(
    messageAccountInfos.map(async (messageAccountInfo, idx) => {
      // TODO: Code block ported from anchor. Use there.
      if (messageAccountInfo === null) {
        throw new Error(`Account does not exist ${publicKeys[idx].toString()}`);
      }
      const discriminator = await accountDiscriminator('MessageAccount');
      if (discriminator.compare(messageAccountInfo.account.data.slice(0, 8))) {
        throw new Error('Invalid account discriminator');
      }

      let message = program.account.messageAccount.coder.accounts.decode(
        'MessageAccount',
        messageAccountInfo.account.data
      );
      let messageBuffer = base64Decode(message.text);
      if (message.encrypted && receiver) {
        if (thread.thread.members.length !== 2) {
          throw new Error(
            'Can only decrypt messages in threads with two members.'
          );
        }
        messageAccountInfo.publicKey;
        const sourcePublicKey = getOtherPublicKey(
          thread.thread.members,
          receiver.publicKey
        );
        const encryptionNonce = getMessageEncryptionNonce(
          messageAccountInfo.publicKey
        );
        messageBuffer = decryptMessage(
          messageBuffer,
          receiver,
          sourcePublicKey,
          encryptionNonce
        )!;
        if (!messageBuffer) {
          throw new Error('Failed to decrypt');
        }
      }
      message.text = new TextDecoder().decode(messageBuffer);
      message.timestamp = new Date(message.timestamp.toNumber());
      return {
        ...messageAccountInfo.account,
        publicKey: publicKeys[idx],
        message,
      } as MessageAccount;
    })
  );
  return messages.reverse();
}

export async function newGroupMutate(
  _url: string,
  program: anchor.Program,
  wallet: Wallet_,
  invitees: PublicKey[] | string[],
  text: string,
  sender?: anchor.web3.Keypair | null
): Promise<ThreadAccount> {
  if (typeof invitees[0] === 'string') {
    invitees = invitees.map((invitee) => new anchor.web3.PublicKey(invitee));
  }
  let threadAccount = await threadCreate(program, wallet);
  invitees.forEach(async (invitee) => {
    threadAccount = await addUserToThread(
      program,
      threadAccount.publicKey,
      invitee as anchor.web3.PublicKey
    );
  });
  await messageCreate(program, threadAccount, text, sender);
  return await threadGet(program, threadAccount.publicKey);
}

/*
Transactions
*/

async function waitForFinality(
  program: anchor.Program,
  transactionStr: string,
  finality: anchor.web3.Finality | undefined = 'confirmed',
  maxRetries = 10, // try 10 times
  sleepDuration = 500 // wait 0.5s between tries
): Promise<anchor.web3.TransactionResponse> {
  try {
    return await waitForFinality_inner(
      program,
      transactionStr,
      finality,
      maxRetries,
      sleepDuration
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function waitForFinality_inner(
  program: anchor.Program,
  transactionStr: string,
  finality: anchor.web3.Finality | undefined = 'confirmed',
  maxRetries = 10, // try 10 times
  sleepDuration = 500 // wait 0.5s between tries
): Promise<anchor.web3.TransactionResponse> {
  let transaction: anchor.web3.TransactionResponse | null = null;
  for (let n = 0; n < maxRetries; n++) {
    transaction = await program.provider.connection.getTransaction(
      transactionStr,
      { commitment: finality }
    );
    if (transaction) {
      break;
    }
    await sleep(sleepDuration);
  }
  if (!transaction) {
    throw new Error('Transaction failed to finalize');
  }
  return transaction;
}

// TODO: instead use separate diffie-helman key with public key signed by the RSA private key.
export function encryptMessage(
  msg: Uint8Array,
  sAccount: anchor.web3.Signer,
  rPublicKey: PublicKey,
  nonce: Uint8Array
): Uint8Array {
  const dhKeys = ed2curve.convertKeyPair({
    publicKey: sAccount.publicKey.toBuffer(),
    secretKey: sAccount.secretKey,
  });
  const dhrPk = ed2curve.convertPublicKey(rPublicKey);
  return nacl.box(msg, nonce, dhrPk, dhKeys.secretKey);
}

export function decryptMessage(
  msg: Uint8Array,
  account: anchor.web3.Keypair,
  fromPk: PublicKey,
  nonce: Uint8Array
): Uint8Array | null {
  const dhKeys = ed2curve.convertKeyPair({
    publicKey: account.publicKey.toBuffer(),
    secretKey: account.secretKey,
  });
  const dhrPk = ed2curve.convertPublicKey(fromPk);
  return nacl.box.open(msg, nonce, dhrPk, dhKeys.secretKey);
}
