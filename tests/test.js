const { it, describe } = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const anchor = require('@project-serum/anchor');
const assert = require('assert');

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Dialect;
let THREADSKP;
let MESSAGE = 'the quick brown fox jumped over the lazy dog';

const _createThreadsAccount = async (message, threadskp, signerkp) => {
  const tx = await PROGRAM.rpc.createUserThreadsAccount(message, {
    accounts: {
      threadsAccount: threadskp.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [signerkp],
    instructions: [
      await PROGRAM.account.threadsData.createInstruction(threadskp),
    ],
  });
  return tx;
};

const _updateThreadsAccount = async (message, threadskp) => {
  const tx = await PROGRAM.rpc.updateUserThreadsAccount(message, {
    accounts: {
      threadsAccount: threadskp.publicKey,
    },
  });
  return tx;
};

describe('test create_user_threads_account', () => {
  it('creates a threads account for the user', async () => {
    THREADSKP = anchor.web3.Keypair.generate();
    // const message = 'the quick brown fox jumped over the lazy dog';
    const tx = await _createThreadsAccount(MESSAGE, THREADSKP, THREADSKP);
    console.log('create tx', tx);
    const thread = await PROGRAM.account.threadsData.fetch(THREADSKP.publicKey);
    console.log('threadaccount', PROGRAM.account.threadsData);
    const returnedMessage = new TextDecoder('utf-8').decode(
      new Uint8Array(thread.message)
    );
    assert.ok(returnedMessage.startsWith(MESSAGE)); // [u8; 280] => trailing zeros
  });

  it('should fail to create a threads account a second time for the user', async () => {
    const message = 'the quick brown dog etc etc';
    chai
      .expect(_createThreadsAccount(message, THREADSKP, THREADSKP))
      .to.eventually.be.rejectedWith(Error);
  });
});

describe('test update_user_threads_account', () => {
  it('updates a threads account for the user', async () => {
    // confirm the old message is still there
    const thread = await PROGRAM.account.threadsData.fetch(THREADSKP.publicKey);
    let returnedMessage = new TextDecoder('utf-8').decode(
      new Uint8Array(thread.message)
    );
    assert.ok(returnedMessage.startsWith(MESSAGE));

    // update the message
    const newkp = anchor.web3.Keypair.generate();
    const updatedMessage = 'the quick brown dog jumped over the lazy fox';
    const tx = await _updateThreadsAccount(updatedMessage, THREADSKP, newkp);
    console.log('update tx', tx);
    const updatedThread = await PROGRAM.account.threadsData.fetch(THREADSKP.publicKey);
    returnedMessage = new TextDecoder('utf-8').decode(
      new Uint8Array(updatedThread.message)
    );
    assert.ok(returnedMessage.startsWith(updatedMessage));
  });
});