import * as anchor from '@project-serum/anchor';
import { AnchorError, Idl, Program, Provider } from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  createDialect,
  createMetadata,
  deleteDialect,
  deleteMetadata,
  DialectAccount,
  Event,
  findDialects,
  getDialect,
  getDialectForMembers,
  getDialectProgramAddress,
  getDialects,
  getMetadata,
  Member,
  sendMessage,
  subscribeToEvents,
  subscribeUser,
} from '../src/api';
import { idl, programs, sleep, Wallet_ } from '../src/utils';
import {
  ed25519KeyPairToCurve25519,
  ENCRYPTION_OVERHEAD_BYTES,
} from '../src/utils/ecdh-encryption';
import { Wallet } from '../src/utils/Wallet';
import { EncryptionProps } from '../src/api/text-serde';
import process from 'process';
import { ITEM_METADATA_OVERHEAD } from '../src/utils/cyclic-bytebuffer';
import { NONCE_SIZE_BYTES } from '../src/utils/nonce-generator';
import { CountDownLatch } from '../src/utils/countdown-latch';

process.env.ANCHOR_WALLET = '/Users/tsmbl/.config/solana/id.json';
chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());

describe('Protocol v1 test', () => {
  const program: anchor.Program = anchor.workspace.Dialect;
  const connection = program.provider.connection;

  describe('Metadata tests', () => {
    let owner: User;
    let writer: User;

    beforeEach(async () => {
      owner = await createUser({
        requestAirdrop: true,
        createMeta: false,
      });
      writer = await createUser({
        requestAirdrop: true,
        createMeta: false,
      });
    });

    it('Create user metadata object(s)', async () => {
      for (const user of [owner, writer]) {
        const { program, publicKey } = user;
        const metadata = await createMetadata(program);
        const gottenMetadata = await getMetadata(
          program,
          publicKey, // TODO: what for this is needed?
        );
        expect(metadata).to.be.deep.eq(gottenMetadata);
      }
    });

    it('Owner deletes metadata', async () => {
      for (const user of [owner, writer]) {
        const { program, publicKey } = user;
        await createMetadata(program);
        await getMetadata(program, publicKey);
        await deleteMetadata(program);
        chai
          .expect(getMetadata(program, publicKey))
          .to.eventually.be.rejectedWith(Error);
      }
    });
  });

  describe('Dialect initialization tests', () => {
    let owner: User;
    let writer: User;
    let nonmember: User;

    let members: Member[] = [];

    beforeEach(async () => {
      owner = await createUser({
        requestAirdrop: true,
        createMeta: true,
      });
      writer = await createUser({
        requestAirdrop: true,
        createMeta: true,
      });
      nonmember = await createUser({
        requestAirdrop: true,
        createMeta: false,
      });
      members = [
        {
          publicKey: owner.publicKey,
          scopes: [true, false], // owner, read-only
        },
        {
          publicKey: writer.publicKey,
          scopes: [false, true], // non-owner, read-write
        },
      ];
    });

    it('Confirm only each user (& dialect) can read encrypted device tokens', async () => {
      // TODO: Implement
      chai.expect(true).to.be.true;
    });

    it("Fail to create a dialect if the owner isn't a member with admin privileges", async () => {
      try {
        await createDialect(nonmember.program, members);
        chai.assert(
          false,
          "Creating a dialect whose owner isn't a member should fail.",
        );
      } catch (e) {
        chai.assert(
          (e as AnchorError).message.includes(
            'The dialect owner must be a member with admin privileges.',
          ),
        );
      }

      try {
        // TODO: write this in a nicer way
        await createDialect(writer.program, members);
        chai.assert(
          false,
          "Creating a dialect whose owner isn't a member should fail.",
        );
      } catch (e) {
        chai.assert(
          (e as AnchorError).message.includes(
            'The dialect owner must be a member with admin privileges.',
          ),
        );
      }
    });

    it('Fail to create a dialect for unsorted members', async () => {
      // use custom unsorted version of createDialect for unsorted members
      const unsortedMembers = members.sort(
        (a, b) => -a.publicKey.toBuffer().compare(b.publicKey.toBuffer()),
      );
      const [publicKey, nonce] = await getDialectProgramAddress(
        writer.program,
        unsortedMembers,
      );
      // TODO: assert owner in members
      const keyedMembers = unsortedMembers.reduce(
        (ms, m, idx) => ({ ...ms, [`member${idx}`]: m.publicKey }),
        {},
      );
      chai
        .expect(
          writer.program.rpc.createDialect(
            // TODO: deprecated / invalid # of args
            new anchor.BN(nonce),
            members.map((m) => m.scopes),
            {
              accounts: {
                dialect: publicKey,
                owner: owner.publicKey,
                ...keyedMembers,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
              },
            },
          ),
        )
        .to.eventually.be.rejectedWith(Error);
    });

    it('Create encrypted dialect for 2 members, with owner and write scopes, respectively', async () => {
      const dialectAccount = await createDialect(owner.program, members, true);
      expect(dialectAccount.dialect.encrypted).to.be.true;
    });

    it('Create unencrypted dialect for 2 members, with owner and write scopes, respectively', async () => {
      const dialectAccount = await createDialect(owner.program, members, false);
      expect(dialectAccount.dialect.encrypted).to.be.false;
    });

    it('Creates unencrypted dialect by default', async () => {
      const dialectAccount = await createDialect(owner.program, members);
      expect(dialectAccount.dialect.encrypted).to.be.false;
    });

    it('Fail to create a second dialect for the same members', async () => {
      await createDialect(owner.program, members);
      chai
        .expect(createDialect(owner.program, members))
        .to.eventually.be.rejectedWith(Error);
    });

    it('Fail to create a dialect for duplicate members', async () => {
      const duplicateMembers = [
        { publicKey: owner.publicKey, scopes: [true, true] } as Member,
        { publicKey: owner.publicKey, scopes: [true, true] } as Member,
      ];
      chai
        .expect(createDialect(owner.program, duplicateMembers))
        .to.be.rejectedWith(Error);
    });

    it('Find a dialect for a given member pair, verify correct scopes.', async () => {
      await createDialect(owner.program, members);
      const dialect = await getDialectForMembers(owner.program, members);
      members.every((m, i) =>
        expect(
          m.publicKey.equals(dialect.dialect.members[i].publicKey) &&
            m.scopes.every(
              (s, j) => s === dialect.dialect.members[i].scopes[j],
            ),
        ),
      );
    });

    it('Subscribe users to dialect', async () => {
      const dialect = await createDialect(owner.program, members);
      // owner subscribes themselves
      await subscribeUser(owner.program, dialect, owner.publicKey);
      // owner subscribes writer
      await subscribeUser(owner.program, dialect, writer.publicKey);
      const ownerMeta = await getMetadata(owner.program, owner.publicKey);
      const writerMeta = await getMetadata(owner.program, writer.publicKey);
      chai
        .expect(
          ownerMeta.subscriptions.filter((s) =>
            s.pubkey.equals(dialect.publicKey),
          ).length,
        )
        .to.equal(1);
      chai
        .expect(
          writerMeta.subscriptions.filter((s) =>
            s.pubkey.equals(dialect.publicKey),
          ).length,
        )
        .to.equal(1);
    });

    it('Should return list of dialects sorted by time desc', async () => {
      // given
      console.log('Creating users');
      const [user1, user2, user3] = await Promise.all([
        createUser(),
        createUser(),
        createUser(),
      ]);
      // create first dialect and subscribe users
      const dialect1 = await createDialectAndSubscribeAllMembers(
        user1,
        user2.publicKey,
      );
      const dialect2 = await createDialectAndSubscribeAllMembers(
        user1,
        user3.publicKey,
      );
      // when
      const afterCreatingDialects = await getDialects(
        user1.program,
        user1.publicKey,
      );
      await sleep(3000); // wait a bit to avoid equal timestamp, since since we get utc seconds as a timestamp
      await sendMessage(
        user1.program,
        dialect1,
        'Dummy message to increment latest message timestamp',
      );
      const afterSendingMessageToDialect1 = await getDialects(
        user1.program,
        user1.publicKey,
      );
      await sleep(3000); // wait a bit to avoid equal timestamp, since since we get utc seconds as a timestamp
      await sendMessage(
        user1.program,
        dialect2,
        'Dummy message to increment latest message timestamp',
      );
      const afterSendingMessageToDialect2 = await getDialects(
        user1.program,
        user1.publicKey,
      );
      // then
      // assert dialects before sending messages
      chai
        .expect(afterCreatingDialects.map((it) => it.publicKey))
        .to.be.deep.eq([dialect2.publicKey, dialect1.publicKey]); // dialect 2 was created after dialect 1
      // assert dialects after sending message to first dialect
      chai
        .expect(afterSendingMessageToDialect1.map((it) => it.publicKey))
        .to.be.deep.eq([dialect1.publicKey, dialect2.publicKey]);
      // assert dialects after sending message to second dialect
      chai
        .expect(afterSendingMessageToDialect2.map((it) => it.publicKey))
        .to.be.deep.eq([dialect2.publicKey, dialect1.publicKey]);
    });

    it('Non-owners fail to delete the dialect', async () => {
      const dialect = await createDialect(owner.program, members);
      chai
        .expect(deleteDialect(writer.program, dialect))
        .to.eventually.be.rejectedWith(Error);
      chai
        .expect(deleteDialect(nonmember.program, dialect))
        .to.eventually.be.rejectedWith(Error);
    });

    it('Owner deletes the dialect', async () => {
      const dialect = await createDialect(owner.program, members);
      await deleteDialect(owner.program, dialect);
      chai
        .expect(getDialectForMembers(owner.program, members))
        .to.eventually.be.rejectedWith(Error);
    });

    it('Fail to subscribe a user twice to the same dialect (silent, noop)', async () => {
      const dialect = await createDialect(owner.program, members);
      await subscribeUser(owner.program, dialect, writer.publicKey);
      const metadata = await getMetadata(program, writer.publicKey);
      // subscribed once
      chai
        .expect(
          metadata.subscriptions.filter((s) =>
            s.pubkey.equals(dialect.publicKey),
          ).length,
        )
        .to.equal(1);
      chai
        .expect(subscribeUser(owner.program, dialect, writer.publicKey))
        .to.be.rejectedWith(Error);
      // still subscribed just once
      chai
        .expect(
          metadata.subscriptions.filter((s) =>
            s.pubkey.equals(dialect.publicKey),
          ).length,
        )
        .to.equal(1);
    });
  });

  describe('Find dialects', () => {
    it('Can find all dialects filtering by user public key', async () => {
      // given
      const [user1, user2, user3] = await Promise.all([
        createUser({
          requestAirdrop: true,
          createMeta: false,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: false,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: false,
        }),
      ]);
      const [user1User2Dialect, user1User3Dialect, user2User3Dialect] =
        await Promise.all([
          createDialect(user1.program, [
            {
              publicKey: user1.publicKey,
              scopes: [true, true],
            },
            {
              publicKey: user2.publicKey,
              scopes: [false, true],
            },
          ]),
          createDialect(user1.program, [
            {
              publicKey: user1.publicKey,
              scopes: [true, true],
            },
            {
              publicKey: user3.publicKey,
              scopes: [false, true],
            },
          ]),
          createDialect(user2.program, [
            {
              publicKey: user2.publicKey,
              scopes: [true, true],
            },
            {
              publicKey: user3.publicKey,
              scopes: [false, true],
            },
          ]),
        ]);
      // when
      const [
        user1Dialects,
        user2Dialects,
        user3Dialects,
        nonExistingUserDialects,
      ] = await Promise.all([
        findDialects(program, {
          userPk: user1.publicKey,
        }),
        findDialects(program, {
          userPk: user2.publicKey,
        }),
        findDialects(program, {
          userPk: user3.publicKey,
        }),
        findDialects(program, {
          userPk: anchor.web3.Keypair.generate().publicKey,
        }),
      ]);
      // then
      expect(
        user1Dialects.map((it) => it.publicKey),
      ).to.deep.contain.all.members([
        user1User2Dialect.publicKey,
        user1User3Dialect.publicKey,
      ]);
      expect(
        user2Dialects.map((it) => it.publicKey),
      ).to.deep.contain.all.members([
        user1User2Dialect.publicKey,
        user2User3Dialect.publicKey,
      ]);
      expect(
        user3Dialects.map((it) => it.publicKey),
      ).to.deep.contain.all.members([
        user2User3Dialect.publicKey,
        user1User3Dialect.publicKey,
      ]);
      expect(nonExistingUserDialects.length).to.be.eq(0);
    });
  });

  describe('Unencrypted messaging tests', () => {
    let owner: User;
    let writer: User;
    let nonmember: User;
    let members: Member[] = [];
    let dialect: DialectAccount;

    beforeEach(async () => {
      const [u1, u2, u3] = await Promise.all([
        createUser({
          requestAirdrop: true,
          createMeta: true,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: true,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: true,
        }),
      ]);
      owner = u1;
      writer = u2;
      nonmember = u3;
      members = [
        {
          publicKey: owner.publicKey,
          scopes: [true, false], // owner, read-only
        },
        {
          publicKey: writer.publicKey,
          scopes: [false, true], // non-owner, read-write
        },
      ];
      dialect = await createDialect(owner.program, members);
    });

    it('Message sender can read the message text and time', async () => {
      // given
      const text = generateRandomText(256);
      // when
      await sendMessage(writer.program, dialect, text);
      // then
      const senderDialect = await getDialectForMembers(
        writer.program,
        dialect.dialect.members,
      );
      const message = senderDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai
        .expect(senderDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it('Message receiver can read the message text and time', async () => {
      // given
      const text = generateRandomText(256);
      // when
      await sendMessage(writer.program, dialect, text);
      // then
      const receiverDialect = await getDialectForMembers(
        owner.program,
        dialect.dialect.members,
      );
      const message = receiverDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai
        .expect(receiverDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it('Anonymous user can read any of the messages', async () => {
      // given
      const text = generateRandomText(256);
      await sendMessage(writer.program, dialect, text);
      // when / then
      const nonMemberDialect = await getDialectForMembers(
        nonmember.program,
        dialect.dialect.members,
      );
      const message = nonMemberDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai.expect(message.owner).to.be.deep.eq(writer.publicKey);
      chai
        .expect(nonMemberDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it('New messages overwrite old, retrieved messages are in order.', async () => {
      // emulate ideal message alignment withing buffer
      const rawBufferSize = 8192;
      const messagesPerDialect = 16;
      const numMessages = messagesPerDialect * 2;
      const salt = 3;
      const targetRawMessageSize = rawBufferSize / messagesPerDialect - salt;
      const timestampSize = 4;
      const ownerMemberIdxSize = 1;
      const messageSerializationOverhead =
        ITEM_METADATA_OVERHEAD + timestampSize + ownerMemberIdxSize;
      const targetTextSize =
        targetRawMessageSize - messageSerializationOverhead;
      const texts = Array(numMessages)
        .fill(0)
        .map(() => generateRandomText(targetTextSize));
      for (let messageIdx = 0; messageIdx < numMessages; messageIdx++) {
        // verify last last N messages look correct
        const messageCounter = messageIdx + 1;
        const text = texts[messageIdx];
        const dialect = await getDialectForMembers(writer.program, members);
        console.log(
          `Sending message ${messageCounter}/${texts.length}
    len = ${text.length}
    idx: ${dialect.dialect.nextMessageIdx}`,
        );
        await sendMessage(writer.program, dialect, text);
        const sliceStart =
          messageCounter <= messagesPerDialect
            ? 0
            : messageCounter - messagesPerDialect;
        const expectedMessagesCount = Math.min(
          messageCounter,
          messagesPerDialect,
        );
        const sliceEnd = sliceStart + expectedMessagesCount;
        const expectedMessages = texts.slice(sliceStart, sliceEnd).reverse();
        const d = await getDialect(writer.program, dialect.publicKey);
        const actualMessages = d.dialect.messages.map((m) => m.text);
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        expect(actualMessages).to.be.deep.eq(expectedMessages);
      }
    });

    it('Message text limit of 853 bytes can be sent/received', async () => {
      const maxMessageSizeBytes = 853;
      const texts = Array(30)
        .fill(0)
        .map(() => generateRandomText(maxMessageSizeBytes));
      for (let messageIdx = 0; messageIdx < texts.length; messageIdx++) {
        const text = texts[messageIdx];
        const messageCounter = messageIdx + 1;
        const dialect = await getDialectForMembers(writer.program, members);
        console.log(
          `Sending message ${messageCounter}/${texts.length}
  len = ${text.length}
  idx: ${dialect.dialect.nextMessageIdx}`,
        );
        // when
        await sendMessage(writer.program, dialect, text);
        const d = await getDialect(writer.program, dialect.publicKey);
        const actualMessages = d.dialect.messages;
        const lastMessage = actualMessages[0];
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        // then
        expect(lastMessage.text).to.be.deep.eq(text);
      }
    });
  });

  describe('Encrypted messaging tests', () => {
    let owner: User;
    let writer: User;
    let nonmember: User;
    let members: Member[] = [];
    let dialect: DialectAccount;

    beforeEach(async () => {
      const [u1, u2, u3] = await Promise.all([
        createUser({
          requestAirdrop: true,
          createMeta: true,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: true,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: true,
        }),
      ]);
      owner = u1;
      writer = u2;
      nonmember = u3;
      members = [
        {
          publicKey: owner.publicKey,
          scopes: [true, false], // owner, read-only
        },
        {
          publicKey: writer.publicKey,
          scopes: [false, true], // non-owner, read-write
        },
      ];
      dialect = await createDialect(owner.program, members, true);
    });

    it('Message sender can send msg and then read the message text and time', async () => {
      // given
      const text = generateRandomText(256);
      // when
      await sendMessage(writer.program, dialect, text, writer.encryptionProps);
      // then
      const senderDialect = await getDialectForMembers(
        writer.program,
        dialect.dialect.members,
        writer.encryptionProps,
      );
      const message = senderDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai.expect(message.owner).to.be.deep.eq(writer.publicKey);
      chai
        .expect(senderDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it('Message receiver can read the message text and time sent by sender', async () => {
      // given
      const text = generateRandomText(256);
      // when
      await sendMessage(writer.program, dialect, text, writer.encryptionProps);
      // then
      const receiverDialect = await getDialectForMembers(
        owner.program,
        dialect.dialect.members,
        owner.encryptionProps,
      );
      const message = receiverDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai.expect(message.owner).to.be.deep.eq(writer.publicKey);
      chai
        .expect(receiverDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it("Non-member can't read (decrypt) any of the messages", async () => {
      // given
      const text = generateRandomText(256);
      await sendMessage(writer.program, dialect, text, writer.encryptionProps);
      // when / then
      expect(
        getDialectForMembers(
          nonmember.program,
          dialect.dialect.members,
          nonmember.encryptionProps,
        ),
      ).to.eventually.be.rejected;
    });

    it('New messages overwrite old, retrieved messages are in order.', async () => {
      // emulate ideal message alignment withing buffer
      const rawBufferSize = 8192;
      const messagesPerDialect = 16;
      const numMessages = messagesPerDialect * 2;
      const salt = 3;
      const targetRawMessageSize = rawBufferSize / messagesPerDialect - salt;
      const timestampSize = 4;
      const ownerMemberIdxSize = 1;
      const messageSerializationOverhead =
        ITEM_METADATA_OVERHEAD +
        ENCRYPTION_OVERHEAD_BYTES +
        NONCE_SIZE_BYTES +
        timestampSize +
        ownerMemberIdxSize;
      const targetTextSize =
        targetRawMessageSize - messageSerializationOverhead;
      const texts = Array(numMessages)
        .fill(0)
        .map(() => generateRandomText(targetTextSize));
      for (let messageIdx = 0; messageIdx < numMessages; messageIdx++) {
        // verify last last N messages look correct
        const messageCounter = messageIdx + 1;
        const text = texts[messageIdx];
        const dialect = await getDialectForMembers(
          writer.program,
          members,
          writer.encryptionProps,
        );
        console.log(
          `Sending message ${messageCounter}/${texts.length}
    len = ${text.length}
    idx: ${dialect.dialect.nextMessageIdx}`,
        );
        await sendMessage(
          writer.program,
          dialect,
          text,
          writer.encryptionProps,
        );
        const sliceStart =
          messageCounter <= messagesPerDialect
            ? 0
            : messageCounter - messagesPerDialect;
        const expectedMessagesCount = Math.min(
          messageCounter,
          messagesPerDialect,
        );
        const sliceEnd = sliceStart + expectedMessagesCount;
        const expectedMessages = texts.slice(sliceStart, sliceEnd).reverse();
        const d = await getDialect(
          writer.program,
          dialect.publicKey,
          writer.encryptionProps,
        );
        const actualMessages = d.dialect.messages.map((m) => m.text);
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        expect(actualMessages).to.be.deep.eq(expectedMessages);
      }
    });

    it('Send/receive random size messages.', async () => {
      const texts = Array(32)
        .fill(0)
        .map(() => generateRandomText(randomInteger(256, 512)));
      for (let messageIdx = 0; messageIdx < texts.length; messageIdx++) {
        const text = texts[messageIdx];
        const messageCounter = messageIdx + 1;
        const dialect = await getDialectForMembers(
          writer.program,
          members,
          writer.encryptionProps,
        );
        console.log(
          `Sending message ${messageCounter}/${texts.length}
    len = ${text.length}
    idx: ${dialect.dialect.nextMessageIdx}`,
        );
        // when
        await sendMessage(
          writer.program,
          dialect,
          text,
          writer.encryptionProps,
        );
        const d = await getDialect(
          program,
          dialect.publicKey,
          writer.encryptionProps,
        );
        const actualMessages = d.dialect.messages;
        const lastMessage = actualMessages[0];
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        // then
        expect(lastMessage.text).to.be.deep.eq(text);
      }
    });

    /* UTF-8 encoding summary:
     - ASCII characters are encoded using 1 byte
     - Roman, Greek, Cyrillic, Coptic, Armenian, Hebrew, Arabic characters are encoded using 2 bytes
     - Chinese and Japanese among others are encoded using 3 bytes
     - Emoji are encoded using 4 bytes
    A note about message length limit and summary:
     - len >= 814 hits max transaction size limit = 1232 bytes https://docs.solana.com/ru/proposals/transactions-v2
     - => best case: 813 symbols per msg (ascii only)
     - => worst case: 203 symbols (e.g. emoji only)
     - => average case depends on character set, see details below:
     ---- ASCII: ±800 characters
     ---- Roman, Greek, Cyrillic, Coptic, Armenian, Hebrew, Arabic: ± 406 characters
     ---- Chinese and japanese: ± 270 characters
     ---- Emoji: ± 203 characters*/
    it('Message text limit of 813 bytes can be sent/received', async () => {
      const maxMessageSizeBytes = 813;
      const texts = Array(30)
        .fill(0)
        .map(() => generateRandomText(maxMessageSizeBytes));
      for (let messageIdx = 0; messageIdx < texts.length; messageIdx++) {
        const text = texts[messageIdx];
        const messageCounter = messageIdx + 1;
        const dialect = await getDialectForMembers(
          writer.program,
          members,
          writer.encryptionProps,
        );
        console.log(
          `Sending message ${messageCounter}/${texts.length}
  len = ${text.length}
  idx: ${dialect.dialect.nextMessageIdx}`,
        );
        // when
        await sendMessage(
          writer.program,
          dialect,
          text,
          writer.encryptionProps,
        );
        const d = await getDialect(
          writer.program,
          dialect.publicKey,
          writer.encryptionProps,
        );
        const actualMessages = d.dialect.messages;
        const lastMessage = actualMessages[0];
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        // then
        expect(lastMessage.text).to.be.deep.eq(text);
      }
    });

    it('2 writers can send a messages and read them when dialect state is linearized before sending msg', async () => {
      // given
      const [writer1, writer2] = await Promise.all([
        createUser(),
        createUser(),
      ]);
      members = [
        {
          publicKey: writer1.publicKey,
          scopes: [true, true], // owner, read-write
        },
        {
          publicKey: writer2.publicKey,
          scopes: [false, true], // non-owner, read-write
        },
      ];
      await createDialect(writer1.program, members, true);
      // when
      let writer1Dialect = await getDialectForMembers(
        writer1.program,
        members,
        writer1.encryptionProps,
      );
      const writer1Text = generateRandomText(256);
      await sendMessage(
        writer1.program,
        writer1Dialect,
        writer1Text,
        writer1.encryptionProps,
      );
      let writer2Dialect = await getDialectForMembers(
        writer2.program,
        members,
        writer2.encryptionProps,
      ); // ensures dialect state linearization
      const writer2Text = generateRandomText(256);
      await sendMessage(
        writer2.program,
        writer2Dialect,
        writer2Text,
        writer2.encryptionProps,
      );

      writer1Dialect = await getDialectForMembers(
        writer1.program,
        members,
        writer1.encryptionProps,
      );
      writer2Dialect = await getDialectForMembers(
        writer2.program,
        members,
        writer2.encryptionProps,
      );

      // then check writer1 dialect state
      const message1Writer1 = writer1Dialect.dialect.messages[1];
      const message2Writer1 = writer1Dialect.dialect.messages[0];
      chai.expect(message1Writer1.text).to.be.eq(writer1Text);
      chai.expect(message1Writer1.owner).to.be.deep.eq(writer1.publicKey);
      chai.expect(message2Writer1.text).to.be.eq(writer2Text);
      chai.expect(message2Writer1.owner).to.be.deep.eq(writer2.publicKey);
      // then check writer2 dialect state
      const message1Writer2 = writer2Dialect.dialect.messages[1];
      const message2Writer2 = writer2Dialect.dialect.messages[0];
      chai.expect(message1Writer2.text).to.be.eq(writer1Text);
      chai.expect(message1Writer2.owner).to.be.deep.eq(writer1.publicKey);
      chai.expect(message2Writer2.text).to.be.eq(writer2Text);
      chai.expect(message2Writer2.owner).to.be.deep.eq(writer2.publicKey);
    });

    // This test was failing before changing nonce generation algorithm
    it('2 writers can send a messages and read them when dialect state is not linearized before sending msg', async () => {
      // given
      const [writer1, writer2] = await Promise.all([
        createUser(),
        createUser(),
      ]);
      members = [
        {
          publicKey: writer1.publicKey,
          scopes: [true, true], // owner, read-only
        },
        {
          publicKey: writer2.publicKey,
          scopes: [false, true], // non-owner, read-write
        },
      ];
      await createDialect(writer1.program, members, true);
      // when
      let writer1Dialect = await getDialectForMembers(
        program,
        members,
        writer1.encryptionProps,
      );
      let writer2Dialect = await getDialectForMembers(
        program,
        members,
        writer2.encryptionProps,
      ); // ensures no dialect state linearization
      const writer1Text = generateRandomText(256);
      await sendMessage(
        writer1.program,
        writer1Dialect,
        writer1Text,
        writer1.encryptionProps,
      );
      const writer2Text = generateRandomText(256);
      await sendMessage(
        writer2.program,
        writer2Dialect,
        writer2Text,
        writer2.encryptionProps,
      );

      writer1Dialect = await getDialectForMembers(
        program,
        members,
        writer1.encryptionProps,
      );
      writer2Dialect = await getDialectForMembers(
        program,
        members,
        writer2.encryptionProps,
      );

      // then check writer1 dialect state
      const message1Writer1 = writer1Dialect.dialect.messages[1];
      const message2Writer1 = writer1Dialect.dialect.messages[0];
      chai.expect(message1Writer1.text).to.be.eq(writer1Text);
      chai.expect(message1Writer1.owner).to.be.deep.eq(writer1.publicKey);
      chai.expect(message2Writer1.text).to.be.eq(writer2Text);
      chai.expect(message2Writer1.owner).to.be.deep.eq(writer2.publicKey);
      // then check writer2 dialect state
      const message1Writer2 = writer2Dialect.dialect.messages[1];
      const message2Writer2 = writer2Dialect.dialect.messages[0];
      chai.expect(message1Writer2.text).to.be.eq(writer1Text);
      chai.expect(message1Writer2.owner).to.be.deep.eq(writer1.publicKey);
      chai.expect(message2Writer2.text).to.be.eq(writer2Text);
      chai.expect(message2Writer2.owner).to.be.deep.eq(writer2.publicKey);
    });
  });

  describe('Subscription tests', () => {
    let owner: User;
    let writer: User;

    beforeEach(async () => {
      const [u1, u2] = await Promise.all([
        createUser({
          requestAirdrop: true,
          createMeta: false,
        }),
        createUser({
          requestAirdrop: true,
          createMeta: false,
        }),
      ]);
      owner = u1;
      writer = u2;
    });

    it('Can subscribe to events and receive them and unsubscribe', async () => {
      // given
      const eventsAccumulator: Event[] = [];
      const expectedEvents = 8;
      const countDownLatch = new CountDownLatch(expectedEvents);
      const subscription = await subscribeToEvents(program, async (it) => {
        console.log('event', it);
        countDownLatch.countDown();
        return eventsAccumulator.push(it);
      });
      // when
      await createMetadata(writer.program); // 1 event
      await createMetadata(owner.program); // 1 event
      const dialectAccount = await createDialectAndSubscribeAllMembers(
        owner,
        writer.publicKey,
      ); // 3 events
      await deleteMetadata(owner.program); // 1 event
      await deleteMetadata(writer.program); // 1 event
      await deleteDialect(owner.program, dialectAccount); // 1 event
      await countDownLatch.await(5000);
      await subscription.unsubscribe();
      // events below should be ignored
      await createMetadata(owner.program);
      await createMetadata(writer.program);
      // then
      chai.expect(eventsAccumulator.length).to.be.eq(expectedEvents);
    });
  });

  async function createUser(
    { requestAirdrop, createMeta }: CreateUserOptions = {
      requestAirdrop: true,
      createMeta: true,
    },
  ): Promise<User> {
    const keypair = web3.Keypair.generate();
    const wallet = Wallet_.embedded(keypair.secretKey);
    const RPC_URL = process.env.RPC_URL || 'http://localhost:8899';
    const dialectConnection = new web3.Connection(RPC_URL, 'recent');
    const dialectProvider = new Provider(
      dialectConnection,
      wallet,
      Provider.defaultOptions(),
    );
    const NETWORK_NAME = 'localnet';
    const DIALECT_PROGRAM_ADDRESS = programs[NETWORK_NAME].programAddress;
    const program = new Program(
      idl as Idl,
      new web3.PublicKey(DIALECT_PROGRAM_ADDRESS),
      dialectProvider,
    );
    const publicKey = wallet.publicKey;
    if (requestAirdrop) {
      const airDropRequest = await connection.requestAirdrop(
        publicKey,
        10 * web3.LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(airDropRequest); // TODO:  replace conneciton
    }
    if (createMeta) {
      await createMetadata(program);
    }
    const encryptionProps = {
      ed25519PublicKey: publicKey.toBytes(),
      diffieHellmanKeyPair: ed25519KeyPairToCurve25519({
        publicKey: keypair.publicKey.toBytes(),
        secretKey: keypair.secretKey,
      }),
    };
    return { program, wallet, publicKey, encryptionProps };
  }
});

interface CreateUserOptions {
  requestAirdrop: boolean;
  createMeta: boolean;
}

function generateRandomText(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

interface User {
  program: Program;
  wallet: Wallet;
  publicKey: PublicKey;
  encryptionProps: EncryptionProps;
}

async function createDialectAndSubscribeAllMembers(
  owner: User,
  otherMember: PublicKey,
  encrypted = false,
) {
  const members: Member[] = [
    {
      publicKey: owner.publicKey,
      scopes: [true, true], // owner, read-only
    },
    {
      publicKey: otherMember,
      scopes: [false, true], // non-owner, read-write
    },
  ];
  const ownerProgram = owner.program;
  const dialect = await createDialect(ownerProgram, members, encrypted);
  await subscribeUser(ownerProgram, dialect, owner.publicKey);
  await subscribeUser(ownerProgram, dialect, otherMember);
  return dialect;
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
