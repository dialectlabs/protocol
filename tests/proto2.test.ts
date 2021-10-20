import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as anchor from '@project-serum/anchor';
import assert from 'assert';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createQueueAccount, writeMessageToQueue } from '../api/proto2';

// anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Proto2;

const receiverKeypair = anchor.web3.Keypair.generate(); // invitee
const receiver = receiverKeypair.publicKey;

const transferTransaction = new Transaction();
transferTransaction.add(
  SystemProgram.transfer({
    fromPubkey: PROGRAM.provider.wallet.publicKey,
    toPubkey: receiver,
    lamports: 1000000000,
  })
);

describe('test', () => {
  const queue_owner = PROGRAM.provider.wallet.publicKey;
  it('send money to receiver', async () => {
    await PROGRAM.provider.send(transferTransaction);
  });
  it('creates a queue account', async () => {
    await createQueueAccount(PROGRAM, queue_owner);
  });
  it('adds a message to queue', async () => {
    await writeMessageToQueue(
      PROGRAM,
      queue_owner,
      queue_owner,
      receiver,
      'blah blah blah'
    );
  });
});
