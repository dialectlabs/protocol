import * as anchor from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { waitForFinality } from '../utils';

/*
Dialect
*/

type Dialect = {
  mint: PublicKey;
}

type DialectAccount = anchor.web3.AccountInfo<Buffer> & {
  dialect: Dialect;
  publicKey: PublicKey;
}

export async function getDialectProgramAddress(program: anchor.Program, mint: splToken.Token): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('dialect'), mint.publicKey.toBuffer()],
    program.programId
  );
}

export async function getDialect(program: anchor.Program, mint: splToken.Token): Promise<DialectAccount> {
  const [publicKey,] = await getDialectProgramAddress(program, mint);
  const dialect = await program.account.dialectAccount.fetch(publicKey);
  const account = await program.provider.connection.getAccountInfo(publicKey);
  return {
    ...account,
    publicKey,
    dialect,
  } as DialectAccount;
}

export async function createDialect(program: anchor.Program, mint: splToken.Token, mintAuthority: anchor.web3.Keypair): Promise<DialectAccount> {
  const [publicKey, nonce] = await getDialectProgramAddress(program, mint);
  const tx = await program.rpc.createDialect(
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
