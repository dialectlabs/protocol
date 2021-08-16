import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as anchor from '@project-serum/anchor';
import assert from 'assert';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  messageCreate,
  addUserToThread,
  threadCreate,
  messagesGet,
  settingsGet,
  threadGet,
  settingsCreate,
} from '../api';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Dialect;

// let settingspk: anchor.web3.PublicKey;
let threadpk: PublicKey;
// new user
const newkp = anchor.web3.Keypair.generate(); // invitee

const transferTransaction = new Transaction();
transferTransaction.add(SystemProgram.transfer({
  fromPubkey: PROGRAM.provider.wallet.publicKey,
  toPubkey: newkp.publicKey,
  lamports: 1000000000
}));

describe('test settings', () => {
  it('creates a settings account for the user', async () => {
    await settingsCreate(PROGRAM.provider.wallet, PROGRAM);
    const settingsAccount = await settingsGet(PROGRAM, PROGRAM.provider.connection, PROGRAM.provider.wallet.publicKey);
    assert.ok(
      settingsAccount.settings.owner.toString() === 
      PROGRAM.provider.wallet.publicKey.toString()
    );
    assert.ok(settingsAccount.settings.threads.length === 0);
  });

  it('should fail to create a settings account a second time for the user', async () => {
    chai
      .expect(settingsCreate(PROGRAM.provider.wallet, PROGRAM))
      .to.eventually.be.rejectedWith(Error);
  });

  it('should fail to create a settings account for the wrong user', async () => {
    const newkp = anchor.web3.Keypair.generate(); // new user
    chai.expect(
      settingsCreate(
        PROGRAM.provider.wallet,
        PROGRAM,
        newkp.publicKey,
        [newkp],
        [await PROGRAM.account.settingsAccount.createInstruction(newkp)], // TODO: is this failing bc newkp is not for the settingsAccount?
      )
    ).to.eventually.be.rejectedWith(Error);  // 0x92 (A seeds constraint was violated)
  });
});

describe('test threads', () => {
  // TODO: Remove test dependence on previous tests
  it('creates a thread account for the user', async () => {
    await PROGRAM.provider.send(transferTransaction);
    const {publicKey} = await threadCreate(PROGRAM, PROGRAM.provider.wallet);
    threadpk = publicKey;
    // TODO: check if invited users' settings accounts exist. if not, make them on their behalf
    const settingsAccount = await settingsGet(PROGRAM, PROGRAM.provider.connection, PROGRAM.provider.wallet.publicKey);
    assert.ok(settingsAccount.settings.threads.length === 1);
    assert.ok(settingsAccount.settings.threads[0].key.toString() === publicKey.toString());

    const threadAccount = await threadGet(
      PROGRAM,
      threadpk,
    );
    assert.ok(threadAccount.thread.members.length === 1);
    assert.ok(threadAccount.thread.members[0].key.toString() === PROGRAM.provider.wallet.publicKey.toString());
  });

  it('adds another user to the thread', async () => {
    // make settings account for new user first
    const {publicKey, nonce} = await settingsCreate(
      PROGRAM.provider.wallet,
      PROGRAM,
      newkp.publicKey,
      [newkp],
    );
    // thread owner invites new user to thread
    await addUserToThread(
      PROGRAM,
      threadpk,
      newkp.publicKey,
      publicKey,
      nonce || 0, // TODO: do this better
    );

    // fetch user settings, confirm
    const settingsAccount = await settingsGet(PROGRAM, PROGRAM.provider.connection, newkp.publicKey);
    assert.ok(settingsAccount.settings.threads.length === 1);
    assert.ok(settingsAccount.settings.threads[0].key.toString() === threadpk.toString());

    const threadAccount = await threadGet(
      PROGRAM,
      threadpk,
    );
    assert.ok(threadAccount.thread.members.length === 2);
    assert.ok(threadAccount.thread.members[1].key.toString() === newkp.publicKey.toString());
  });
});

describe('test messages', () => {
  it('sends a message from alice to bob', async () => {
    let threadAccount = await threadGet(
      PROGRAM,
      threadpk,
    );
    const n = 5;
    for (let i = 0; i < n; i++) { 
      const text = 'h'.repeat(i);
      console.log(`sending test message ${i + 1} of ${n}`);
      await messageCreate(PROGRAM, threadAccount, text);
      threadAccount = await threadGet(PROGRAM, threadpk);
    }
    const messages = await messagesGet(PROGRAM, threadAccount);
    for (let i = 0; i < n; i++) {
      assert.ok(messages[i].message.text === 'h'.repeat(n - i - 1));
    }
  });
});
