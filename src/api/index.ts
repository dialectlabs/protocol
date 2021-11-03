import * as anchor from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { waitForFinality } from '../utils';

/*
Mint Dialect
*/

type MintDialect = {
  mint: PublicKey;
}

type MintDialectAccount = anchor.web3.AccountInfo<Buffer> & {
  dialect: MintDialect;
  publicKey: PublicKey;
}

export async function getMintDialectProgramAddress(program: anchor.Program, mint: splToken.Token): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('dialect'), mint.publicKey.toBuffer()],
    program.programId
  );
}

export async function getDialect(program: anchor.Program, mint: splToken.Token): Promise<MintDialectAccount> {
  const [publicKey,] = await getMintDialectProgramAddress(program, mint);
  const dialect = await program.account.mintDialectAccount.fetch(publicKey);
  const account = await program.provider.connection.getAccountInfo(publicKey);
  return {
    ...account,
    publicKey,
    dialect,
  } as MintDialectAccount;
}

export async function createMintDialect(program: anchor.Program, mint: splToken.Token, mintAuthority: anchor.web3.Keypair): Promise<MintDialectAccount> {
  const [publicKey, nonce] = await getMintDialectProgramAddress(program, mint);
  const tx = await program.rpc.createMintDialect(
    new anchor.BN(nonce),
    {
      accounts: {
        dialect: publicKey,
        mint: mint.publicKey,
        mintAuthority: mintAuthority.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [mintAuthority],
    }
  );
  await waitForFinality(program, tx);
  return await getDialect(program, mint);
}


/*
Messages
*/

type Message = {
  sender: PublicKey;
  text: string;
}

type MessagesAccount = anchor.web3.AccountInfo<Buffer> & {
  messages: Message[];
  publicKey: PublicKey;
}

export async function sendMessage(program: anchor.Program, mint: splToken.Token, sender: anchor.web3.Keypair): Promise<Message> {
  return { text: 'hello' } as Message;
}
