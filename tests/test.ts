import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as anchor from '@project-serum/anchor';
import assert from 'assert';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  watcherCreate,
  watcherThreadsGet,
  messageCreate,
  addUserToThread,
  threadCreate,
  messagesGet,
  settingsGet,
  threadGet,
  settingsCreate,
  base64Encode,
  base64Decode,
  encryptMessage,
  decryptMessage,
} from '../api';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Dialect;

// let settingspk: anchor.web3.PublicKey;
let threadpk: PublicKey;
// new user
const newkp = anchor.web3.Keypair.generate(); // invitee

const transferTransaction = new Transaction();
transferTransaction.add(
  SystemProgram.transfer({
    fromPubkey: PROGRAM.provider.wallet.publicKey,
    toPubkey: newkp.publicKey,
    lamports: 1000000000,
  })
);

describe('test watcher create', () => {
  it('creates a watcher account', async () => {
    await watcherCreate(PROGRAM);
  });
});

describe('test settings', () => {
  it('creates a settings account for the user', async () => {
    const settingsAccount = await settingsCreate(
      PROGRAM.provider.wallet,
      PROGRAM
    );
    const gottenSettingsAccount = await settingsGet(
      PROGRAM,
      PROGRAM.provider.connection,
      PROGRAM.provider.wallet.publicKey
    );
    assert.ok(
      settingsAccount.settings.owner.toString() ===
        PROGRAM.provider.wallet.publicKey.toString()
    );
    assert.ok(settingsAccount.settings.threads.length === 0);
    assert.ok(
      settingsAccount.publicKey.toString() ==
        gottenSettingsAccount.publicKey.toString()
    );
    assert.ok(
      settingsAccount.settings.threads.length ===
        gottenSettingsAccount.settings.threads.length
    );
  });

  it('should fail to create a settings account a second time for the user', async () => {
    chai
      .expect(settingsCreate(PROGRAM.provider.wallet, PROGRAM))
      .to.eventually.be.rejectedWith(Error);
  });

  it('should fail to create a settings account for the wrong user', async () => {
    const newkp = anchor.web3.Keypair.generate(); // new user
    chai
      .expect(
        settingsCreate(
          PROGRAM.provider.wallet,
          PROGRAM,
          newkp.publicKey,
          [newkp],
          [await PROGRAM.account.settingsAccount.createInstruction(newkp)] // TODO: is this failing bc newkp is not for the settingsAccount?
        )
      )
      .to.eventually.be.rejectedWith(Error); // 0x92 (A seeds constraint was violated)
  });
});

describe('test threads', () => {
  // TODO: Remove test dependence on previous tests
  it('creates a thread account for the user', async () => {
    await PROGRAM.provider.send(transferTransaction);
    const threadAccount = await threadCreate(PROGRAM, PROGRAM.provider.wallet);
    threadpk = threadAccount.publicKey;
    // TODO: check if invited users' settings accounts exist. if not, make them on their behalf
    const settingsAccount = await settingsGet(
      PROGRAM,
      PROGRAM.provider.connection,
      PROGRAM.provider.wallet.publicKey
    );
    assert.ok(settingsAccount.settings.threads.length === 1);
    assert.ok(
      settingsAccount.settings.threads[0].key.toString() ===
        threadAccount.publicKey.toString()
    );

    const gottenThreadAccount = await threadGet(PROGRAM, threadpk);
    assert.ok(threadAccount.thread.members.length === 1);
    assert.ok(
      threadAccount.thread.members[0].key.toString() ===
        PROGRAM.provider.wallet.publicKey.toString()
    );
    assert.ok(
      threadAccount.publicKey.toString() ===
        gottenThreadAccount.publicKey.toString()
    );
  });

  it('adds another user to the thread', async () => {
    // make settings account for new user first
    const settingsAccount = await settingsCreate(
      PROGRAM.provider.wallet,
      PROGRAM,
      newkp.publicKey,
      [newkp]
    );
    // thread owner invites new user to thread
    await addUserToThread(PROGRAM, threadpk, newkp.publicKey);

    // fetch user settings, confirm
    const gottenSettingsAccount = await settingsGet(
      PROGRAM,
      PROGRAM.provider.connection,
      newkp.publicKey
    );
    assert.ok(gottenSettingsAccount.settings.threads.length === 1);
    assert.ok(
      gottenSettingsAccount.settings.threads[0].key.toString() ===
        threadpk.toString()
    );

    const threadAccount = await threadGet(PROGRAM, threadpk);
    assert.ok(threadAccount.thread.members.length === 2);
    assert.ok(
      threadAccount.thread.members[1].key.toString() ===
        newkp.publicKey.toString()
    );
  });
});

describe('b64 encode', () => {
  it('encode-decode-inverse', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 7, 8]);
    let encoded = base64Encode(data);
    let decoded = base64Decode(encoded);
    assert.strictEqual(decoded.constructor.name, data.constructor.name);
    assert.strictEqual(data.toString(), decoded.toString());
  });
});

describe('encrypt-decrypt', () => {
  it('encode-decode-inverse', async () => {
    const text = 'Hello world!';
    const nonce = new Uint8Array(Array.from({ length: 24 }, (v, idx) => idx));
    const data = new TextEncoder().encode(text);
    const encrypted = encryptMessage(
      data,
      PROGRAM.provider.wallet.payer,
      newkp.publicKey,
      nonce
    );
    const decrypted = decryptMessage(
      encrypted,
      newkp,
      PROGRAM.provider.wallet.publicKey,
      nonce
    );
    const result = new TextDecoder().decode(decrypted!);
    assert.strictEqual(text, result);
  });
});

describe('test messages', () => {
  it('sends a message from alice to bob', async () => {
    let threadAccount = await threadGet(PROGRAM, threadpk);
    const n = 5;
    const computed_timestamps = [];
    const sent_texts : string[] = [];
    for (let i = 0; i < n; i++) {
      const text = 'h'.repeat(i);
      sent_texts.unshift(text);
      await messageCreate(PROGRAM, threadAccount, text);
      computed_timestamps.push(new Date().valueOf());
      threadAccount = await threadGet(PROGRAM, threadpk);
    }

    const messages = await messagesGet(PROGRAM, threadAccount, n);
    const received_timestamps = messages.map((m) =>
      m.message.timestamp.valueOf()
    );
    const message_texts = messages.map((m) => m.message.text);
    for (let i = 0; i < n; i++) {
      // Check that timestamps are sorta close to when we sent the message.
      assert.ok(
        Math.abs(computed_timestamps[i] - received_timestamps[i]) < 10_000
      );
      assert.strictEqual(message_texts[i], sent_texts[i]);
    }
    // Check that time stamps are sorted.
    for (let i = 0; i < n - 1; i++) {
      assert.ok(received_timestamps[i] > received_timestamps[i + 1]);
    }
  });
});

describe('test encrypted messages', () => {
  it('sends a message from alice to bob', async () => {
    let threadAccount = await threadGet(PROGRAM, threadpk);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const text = 'h'.repeat(i);
      await messageCreate(
        PROGRAM,
        threadAccount,
        text,
        PROGRAM.provider.wallet.payer,
        true
      );
      threadAccount = await threadGet(PROGRAM, threadpk);
    }
    const messages = await messagesGet(PROGRAM, threadAccount, n, newkp);
    for (let i = 0; i < n; i++) {
      assert.strictEqual(messages[i].message.text, 'h'.repeat(n - i - 1));
    }
  });
});

describe('test watcher', () => {
  it('watcher can see thread list', async () => {
    let threads = await watcherThreadsGet(PROGRAM);
    assert.strictEqual(threads.length, 1);
    assert.strictEqual(threads[0].key.toString(), threadpk.toString());
  });
});
