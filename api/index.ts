import { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
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

export async function getSettings(_url: string,  program: anchor.Program, connection: Connection, publicKey: PublicKey): Promise<unknown> {
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
      instructions: [await program.account.threadAccount.createInstruction(threadkp)],
    },
  );
  console.log('tx', tx);
  return {transaction: tx, publicKey: threadkp.publicKey};
}