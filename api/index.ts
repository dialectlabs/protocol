import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { sha256 } from 'js-sha256';
import {Wallet_, sleep} from '../utils';

// TODO: Ported from anchor. Use there.
// Calculates unique 8 byte discriminator prepended to all anchor state accounts.
// Calculates unique 8 byte discriminator prepended to all anchor accounts.
export async function accountDiscriminator(name: string): Promise<Buffer> {
  return Buffer.from(sha256.digest(`account:${name}`)).slice(0, 8);
}

export async function decode<T = unknown>(accountName: string, ix: Buffer): T {
  // Chop off the discriminator before decoding.
  const data = ix.slice(8);
  const layout = this.accountLayouts.get(accountName);
  return layout.decode(data);
}
// export async function stateDiscriminator(name: string): Promise<Buffer> {
//   const ns = anchor.utils.features.isSet('anchor-deprecated-state') ? 'account' : 'state';
//   return Buffer.from(sha256.digest(`${ns}:${name}`)).slice(0, 8);
// }

export async function accountInfoGet(connection: Connection, publicKey: PublicKey): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await connection.getAccountInfo(publicKey);
}

export async function accountInfoFetch(_url: string, connection: Connection, publicKeyStr: string): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  const publicKey = new anchor.web3.PublicKey(publicKeyStr);
  return await accountInfoGet(connection, publicKey);
}

export async function ownerFetcher(_url: string, wallet: Wallet_, connection: Connection): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await accountInfoGet(connection, wallet.publicKey);
}

/*
Settings
*/

async function settingsProgramAddressGet(
  program: anchor.Program, publicKey: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      publicKey.toBuffer(),
      Buffer.from('settings_account'),
    ],
    program.programId,
  );
}

type SettingsThreadRef = {
  key: PublicKey
}

type SettingsData = {
  owner: PublicKey,
  threads: SettingsThreadRef[],
}

type SettingsAccount = anchor.web3.AccountInfo<Buffer> & {
  settings: SettingsData,
  publicKey: PublicKey,
}

export async function settingsGet(
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey
): Promise<SettingsAccount> {
  const [settingspk,] = await settingsProgramAddressGet(program, publicKey);
  const data = await program.account.settingsAccount.fetch(settingspk);
  const account = await connection.getAccountInfo(settingspk);
  return {
    ...account,
    publicKey: settingspk,
    settings: data
  } as SettingsAccount;
}

export async function settingsFetch(
  _url: string, 
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey | string,
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
  instructions?: anchor.web3.TransactionInstruction[] | undefined,
): Promise<SettingsAccount> {
  const [publicKey, nonce] = await settingsProgramAddressGet(program, owner || wallet.publicKey);
  const tx = await program.rpc.createUserSettingsAccount(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: owner || program.provider.wallet.publicKey,
        settingsAccount: publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers,
      instructions,
    }
  );
  try {
    await waitForFinality(program, tx);
  } catch (e) {
    console.error(e);
    throw e;
  }
  
  return await settingsGet(program, program.provider.connection, owner || wallet.publicKey);
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
  key: PublicKey,
}

type ThreadData = {
  owner: PublicKey,
  members: ThreadMember[],
  messageIdx: number,
}

export type ThreadAccount = anchor.web3.AccountInfo<Buffer> & {
  thread: ThreadData,
  publicKey: PublicKey,
}

export async function threadMutate(
  _url: string,
  program: anchor.Program,
  wallet: Wallet_,
): Promise<ThreadAccount> {
  return await threadCreate(program, wallet);
}

export async function threadCreate(program: anchor.Program, wallet: Wallet_): Promise<ThreadAccount> {
  const kp = anchor.web3.Keypair.generate();
  const [settingspk, nonce] = await settingsProgramAddressGet(program, wallet.publicKey);
  const tx = await program.rpc.createThreadAccount(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: program.provider.wallet.publicKey,
        threadAccount: kp.publicKey,
        settingsAccount: settingspk,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [kp],
      instructions: [await program.account.threadAccount.createInstruction(kp, 512)],
    },
  );

  await waitForFinality(program, tx);
  return await threadGet(program, kp.publicKey);
}

export async function threadFetch(_url: string, program: anchor.Program, publicKey: PublicKey | string): Promise<ThreadAccount> {
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
  return {...account, publicKey, thread: data} as ThreadAccount;
}

export async function threadsFetch(_url: string, program: anchor.Program, publicKeys: PublicKey[] | string[]): Promise<ThreadAccount[]> {
  if (publicKeys.length < 1) return [];
  if (typeof publicKeys[0] === 'string') {
    publicKeys = publicKeys.map(publicKey => new anchor.web3.PublicKey(publicKey));
  }
  return await threadsGet(program, publicKeys as PublicKey[]);
}

export async function threadsGet(program: anchor.Program, publicKeys: PublicKey[]): Promise<ThreadAccount[]> {
  const accountInfos = await anchor.utils.rpc.getMultipleAccounts(program.provider.connection, publicKeys);
  const threads = (await Promise.all(accountInfos.map(async (accountInfo, idx) => {
    // TODO: Code block ported from anchor. Use there.
    if (accountInfo === null) {
      throw new Error(`Account does not exist ${publicKeys[idx].toString()}`);
    }
    const discriminator = await accountDiscriminator('ThreadAccount');
    if (discriminator.compare(accountInfo.account.data.slice(0, 8))) {
      throw new Error('Invalid account discriminator');
    }

    return {...accountInfo.account, publicKey: publicKeys[idx], thread: program.account.threadAccount.coder.accounts.decode('ThreadAccount', accountInfo.account.data)} as ThreadAccount;
  })));
  return threads;
}

export async function userThreadMutate(_url: string, program: anchor.Program, thread: PublicKey, invitee: PublicKey): Promise<ThreadAccount> {
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
  const tx = await program.rpc.addUserToThread(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: program.provider.wallet.publicKey,
        invitee,
        threadAccount: thread,
        inviteeSettingsAccount: publicKey,
      },
      signers: signers || undefined,
      instructions: instructions || undefined,
    },
  );
  await waitForFinality(program, tx);
  return await threadGet(program, thread);
}

/*
Messages
*/

type MessageData = {
  owner: PublicKey,
  text: string,
  idx: number,
}

type MessageAccount = anchor.web3.AccountInfo<Buffer> & {
  message: MessageData,
  publicKey: PublicKey,
}

export async function messageProgramAddressGet(
  program: anchor.Program, threadPubkey: PublicKey, messageIdx: string,
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      threadPubkey.toBuffer(),
      Buffer.from('message_account'),
      Buffer.from(messageIdx),
    ], program.programId,
  );
}

export async function messageMutate(
  _url: string,
  program: anchor.Program,
  thread: ThreadAccount | string,
  text: string, sender?: anchor.web3.Keypair | null
): Promise<MessageAccount[]> {
  if (typeof thread === 'string') {
    thread = await threadGet(program, new anchor.web3.PublicKey(thread));
  }
  return await messageCreate(program, thread, text, sender);
}

export async function messageCreate(
  program: anchor.Program,
  thread: ThreadAccount,
  text: string,
  sender?: anchor.web3.Keypair | null,
): Promise<MessageAccount[]> {
  const [messagepk, nonce] = await messageProgramAddressGet(program, thread.publicKey, (thread.thread.messageIdx + 1).toString());
  const tx = await program.rpc.addMessageToThread(
    new anchor.BN(nonce),
    text,
    {
      accounts: {
        sender: sender?.publicKey || program.provider.wallet.publicKey,
        messageAccount: messagepk,
        threadAccount: thread.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [sender] || undefined,
    },
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
): Promise<MessageAccount[]> {
  // TODO: Protect against invalid batch size
  if (!batchSize) {
    batchSize = 20;
  }
  const maxIdx = thread.thread.messageIdx;
  const minIdx = Math.max(maxIdx - batchSize, 1);
  const idxs = Array(maxIdx - minIdx + 1).fill(null).map((_, i) => minIdx + i);
  // TODO: Batch RPC calls
  const publicKeys = await Promise.all(idxs.map(async (idx) => {
    const [messagepk,] = await messageProgramAddressGet(program, thread.publicKey, idx.toString());
    return messagepk;
  }));
  const accountInfos = await anchor.utils.rpc.getMultipleAccounts(program.provider.connection, publicKeys);
  const messages = (await Promise.all(accountInfos.map(async (accountInfo, idx) => {
    // TODO: Code block ported from anchor. Use there.
    if (accountInfo === null) {
      throw new Error(`Account does not exist ${publicKeys[idx].toString()}`);
    }
    const discriminator = await accountDiscriminator('MessageAccount');
    if (discriminator.compare(accountInfo.account.data.slice(0, 8))) {
      throw new Error('Invalid account discriminator');
    }

    return {...accountInfo.account, publicKey: publicKeys[idx], message: program.account.messageAccount.coder.accounts.decode('MessageAccount', accountInfo.account.data)} as MessageAccount;
  })));
  return messages.reverse();
}

export async function newGroupMutate(_url: string, program: anchor.Program, wallet: Wallet_, invitees: PublicKey[] | string[], text: string): Promise<ThreadAccount> {
  if (typeof invitees[0] === 'string') {
    invitees = invitees.map(invitee => new anchor.web3.PublicKey(invitee));
  }
  let threadAccount = await threadCreate(program, wallet);
  invitees.forEach(async invitee => {
    threadAccount = await addUserToThread(program, threadAccount.publicKey, invitee as anchor.web3.PublicKey);
  });
  await messageCreate(program, threadAccount, text);
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
  sleepDuration = 500, // wait 0.5s between tries
): Promise<anchor.web3.TransactionResponse> {
  let transaction: anchor.web3.TransactionResponse | null = null;
  for (let n = 0; n < maxRetries; n++) {
    transaction = await program.provider.connection.getTransaction(
      transactionStr,
      {commitment: finality},
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