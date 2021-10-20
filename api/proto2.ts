import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { Wallet_, waitForFinality } from '../utils';

async function getQueueProgramAddress(
  program: anchor.Program,
  owner: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [owner.toBuffer(), Buffer.from('queue_account')],
    program.programId
  );
}

export async function createQueueAccount(
  program: anchor.Program,
  queueOwner?: anchor.web3.PublicKey
): Promise<void> {
  queueOwner ||= program.provider.wallet.publicKey;
  const [queueAccount, queueNonce] = await getQueueProgramAddress(
    program,
    queueOwner
  );
  console.log({ queueAccount, queueNonce });
  const tx = await program.rpc.createQueueAccount(new anchor.BN(queueNonce), {
    accounts: {
      queueOwner,
      queueAccount,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
  });
  await waitForFinality(program, tx);
}

export async function writeMessageToQueue(
  program: anchor.Program,
  queueOwner: anchor.web3.PublicKey,
  sender: anchor.web3.PublicKey,
  receiver: anchor.web3.PublicKey,
  text: String
) {
  queueOwner ||= program.provider.wallet.publicKey;
  const timestamp = new anchor.BN(Date.now());
  const [queueAccount, queueNonce] = await getQueueProgramAddress(
    program,
    queueOwner
  );
  console.log({ queueAccount, queueNonce });
  const tx = await program.rpc.addMessageToQueue(
    new anchor.BN(queueNonce),
    text,
    timestamp,
    {
      accounts: {
        sender,
        receiver,
        queueOwner,
        queueAccount,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        // systemProgram: anchor.web3.SystemProgram.programId,
      },
    }
  );
  await waitForFinality(program, tx);
}
