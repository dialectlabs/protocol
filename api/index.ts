import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import {Wallet_} from '../utils';

export async function getAccountInfo(connection: Connection, publicKey: PublicKey): Promise<anchor.web3.AccountInfo<Buffer> | null> {
  return await connection.getAccountInfo(publicKey);
}

export async function _findSettingsProgramAddress(
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

export async function findMessageProgramAddress(
  program: anchor.Program, threadPubkey: unknown, messageIdx: string,
): Promise<[anchor.web3.PublicKey, number]> {
  // console.log('thread.account.publicKey', thread.account.publicKey.slice(8));
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      threadPubkey.toBuffer(),
      Buffer.from('message_account'),
      Buffer.from(messageIdx),
    ], program.programId,
  );
}

export async function getSettings(
  _url: string, 
  program: anchor.Program,
  connection: Connection,
  publicKey: PublicKey
): Promise<unknown> {
  const [settingspk,] = await _findSettingsProgramAddress(program, publicKey);
  const data = await program.account.settingsAccount.fetch(settingspk);
  const account = await connection.getAccountInfo(settingspk);
  return {data, account: {...account, publicKey: `${settingspk?.toBase58()}`}};
}

export async function createThreadAccount(program: anchor.Program, wallet: Wallet_): Promise<unknown> {
  const threadkp = anchor.web3.Keypair.generate();
  const [settingspk, nonce] = await _findSettingsProgramAddress(program, wallet.publicKey);
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

export async function addMessageToThread(
  program: anchor.Program,
  threadPublicKey: PublicKey,
  thread: unknown,
  text: string,
  sender?: anchor.web3.Keypair | null,
): Promise<unknown> {
  console.log('thread', thread);
  const [messagepk, nonce] = await findMessageProgramAddress(program, threadPublicKey, thread.data.messageIdx.toString());
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
