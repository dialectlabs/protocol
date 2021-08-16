import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import {Wallet_} from '../utils';

type CreateResponse = {
  tx: unknown,
  publicKey: PublicKey,
  nonce?: number | undefined,
}

export async function getAccountInfo(connection: Connection, publicKey: PublicKey): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await connection.getAccountInfo(publicKey);
}

export async function ownerFetcher(_url: string, wallet: Wallet_, connection: Connection): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await getAccountInfo(connection, wallet.publicKey);
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
  publicKey: PublicKey | undefined,
}

export async function settingsGet(
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey
): Promise<SettingsAccount> {
  const [settingspk,] = await settingsProgramAddressGet(program, publicKey);
  const data: SettingsData = await program.account.settingsAccount.fetch(settingspk) as SettingsData;
  const account = await connection.getAccountInfo(settingspk);
  return {
    ...account,
    publicKey,
    settings: data
  } as SettingsAccount;
}

export async function settingsFetch(
  _url: string, 
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey
): Promise<unknown> {
  return await settingsGet(program, connection, publicKey);
}

export async function settingsCreate(
  wallet: Wallet_,
  program: anchor.Program,
  owner?: anchor.web3.PublicKey | undefined,
  signers?: anchor.web3.Keypair[] | undefined,
  instructions?: anchor.web3.TransactionInstruction[] | undefined,
): Promise<CreateResponse> {
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
  return {tx, publicKey, nonce};
}

export async function settingsMutate(
  _url: string,
  wallet: Wallet_,
  program: anchor.Program
): Promise<unknown> {
  return await settingsCreate(wallet, program);
}

/*
Threads
*/

export async function createThreadAccount(program: anchor.Program, wallet: Wallet_): Promise<unknown> {
  const threadkp = anchor.web3.Keypair.generate();
  const [settingspk, nonce] = await settingsProgramAddressGet(program, wallet.publicKey);
  const tx = await program.rpc.createThreadAccount(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: program.provider.wallet.publicKey,
        threadAccount: threadkp.publicKey,
        settingsAccount: settingspk,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [threadkp],
      instructions: [await program.account.threadAccount.createInstruction(threadkp, 512)],
    },
  );
  return {transaction: tx, publicKey: threadkp.publicKey};
}

export async function getThreadAccount(
  program: anchor.Program,
  publicKey: PublicKey
): Promise<unknown> {
  const data = await program.account.threadAccount.fetch(publicKey);
  const account = await program.provider.connection.getAccountInfo(publicKey);
  return {data, account: {...account, publicKey: `${publicKey?.toBase58()}`}};
}

export async function addUserToThread(
  program: anchor.Program,
  thread: PublicKey,
  invitee: PublicKey,
  inviteeSettingsAccount: PublicKey,
  nonce: number,
  signers?: anchor.web3.Keypair[] | null,
  instructions?: anchor.web3.TransactionInstruction[] | null
): Promise<unknown> {
  const tx = await program.rpc.addUserToThread(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: program.provider.wallet.publicKey,
        invitee,
        threadAccount: thread,
        inviteeSettingsAccount,
      },
      signers: signers || undefined,
      instructions: instructions || undefined,
    },
  );
  return tx;
}

/*
Messages
*/

export async function findMessageProgramAddress(
  program: anchor.Program, threadPubkey: unknown, messageIdx: string,
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      threadPubkey.toBuffer(),
      Buffer.from('message_account'),
      Buffer.from(messageIdx),
    ], program.programId,
  );
}

export async function addMessageToThread(
  program: anchor.Program,
  threadPublicKey: PublicKey,
  thread: unknown,
  text: string,
  sender?: anchor.web3.Keypair | null,
): Promise<unknown> {
  const [messagepk, nonce] = await findMessageProgramAddress(program, threadPublicKey, (thread.data.messageIdx + 1).toString());
  const tx = await program.rpc.addMessageToThread(
    new anchor.BN(nonce),
    text,
    {
      accounts: {
        sender: sender?.publicKey || program.provider.wallet.publicKey,
        messageAccount: messagepk,
        threadAccount: threadPublicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [sender] || undefined,
    },
  );
  return tx;
}

export async function getMessages(
  program: anchor.Program,
  threadpk: PublicKey,
  thread: unknown,
  batchSize?: number | undefined,
): Promise<unknown[]> {
  if (!batchSize) {
    batchSize = 20;
  }
  const maxIdx = thread.data.messageIdx;
  const minIdx = Math.max(maxIdx - batchSize, 1);
  const idxs = Array(maxIdx - minIdx + 1).fill(null).map((_, i) => minIdx + i);
  // TODO: Batch RPC calls
  const messages = (await Promise.all(idxs.map(async (idx) => {
    const [messagepk,] = await findMessageProgramAddress(program, threadpk, idx.toString());
    const data = await program.account.messageAccount.fetch(messagepk);
    const account = await program.provider.connection.getAccountInfo(messagepk);
    return {data, account: {...account, publicKey: `${messagepk?.toBase58()}`}};
  }))).reverse(); // descending
  return messages;
}
