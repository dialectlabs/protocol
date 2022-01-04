import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  createDialect,
  createMetadata,
  DEVICE_TOKEN_LENGTH,
  DialectAccount,
  getDialect,
  getDialectForMembers,
  getDialectProgramAddress,
  getDialects,
  getMetadata,
  Member,
  sendMessage,
  subscribeUser,
  updateDeviceToken,
} from '../src/api';
import { sleep, waitForFinality } from '../src/utils';
import { ITEM_METADATA_OVERHEAD } from '../src/utils/cyclic-bytebuffer';
import { ENCRYPTION_OVERHEAD_BYTES } from '../src/utils/ecdh-encryption';
import { NONCE_SIZE_BYTES } from '../src/utils/nonce-generator';
import { randomInt } from 'crypto';

const dialectKeypair = anchor.web3.Keypair.generate();

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());

describe('Protocol v1 test', () => {
  const program: anchor.Program = anchor.workspace.Dialect;
  const connection = program.provider.connection;

  describe('Metadata tests', () => {
    let owner: web3.Keypair;
    let writer: web3.Keypair;

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
      const deviceToken = 'a'.repeat(DEVICE_TOKEN_LENGTH);
      for (const member of [owner, writer]) {
        const metadata = await createMetadata(program, member);
        const gottenMetadata = await getMetadata(program, member.publicKey);
        expect(metadata.deviceToken).to.be.eq(null);
        expect(gottenMetadata.deviceToken).to.be.eq(null);
        const updatedMetadata = await updateDeviceToken(
          program,
          member,
          dialectKeypair.publicKey,
          deviceToken,
        );
        expect(updatedMetadata.deviceToken?.toString()).to.be.eq(deviceToken);
      }
    });
  });

  describe('Dialect initialization tests', () => {
    let owner: web3.Keypair;
    let writer: web3.Keypair;
    let nonmember: web3.Keypair;

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

    it("Transfers funds to writer's account", async () => {
      const senderBalanceBefore =
        (await program.provider.connection.getAccountInfo(owner.publicKey))!
          .lamports / web3.LAMPORTS_PER_SOL;
      const receiver1BalanceBefore =
        (await program.provider.connection.getAccountInfo(writer.publicKey))!
          ?.lamports / web3.LAMPORTS_PER_SOL || 0;
      const receiver2BalanceBefore =
        (await program.provider.connection.getAccountInfo(nonmember.publicKey))!
          ?.lamports / web3.LAMPORTS_PER_SOL || 0;
      const tx = await program.rpc.transfer(
        new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
        new anchor.BN(2 * web3.LAMPORTS_PER_SOL),
        {
          accounts: {
            sender: owner.publicKey,
            receiver1: writer.publicKey,
            receiver2: nonmember.publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [owner],
        },
      );
      await waitForFinality(program, tx);
      const senderBalanceAfter =
        (await program.provider.connection.getAccountInfo(owner.publicKey))!
          .lamports / web3.LAMPORTS_PER_SOL;
      const receiver1BalanceAfter =
        (await program.provider.connection.getAccountInfo(writer.publicKey))!
          ?.lamports / web3.LAMPORTS_PER_SOL || 0;
      const receiver2BalanceAfter =
        (await program.provider.connection.getAccountInfo(nonmember.publicKey))!
          ?.lamports / web3.LAMPORTS_PER_SOL || 0;
    });

    it('Fail to create a dialect for unsorted members', async () => {
      // use custom unsorted version of createDialect for unsorted members
      const unsortedMembers = members.sort(
        (a, b) => -a.publicKey.toBuffer().compare(b.publicKey.toBuffer()),
      );
      const [publicKey, nonce] = await getDialectProgramAddress(
        program,
        unsortedMembers,
      );
      // TODO: assert owner in members
      const keyedMembers = unsortedMembers.reduce(
        (ms, m, idx) => ({ ...ms, [`member${idx}`]: m.publicKey }),
        {},
      );
      chai
        .expect(
          program.rpc.createDialect(
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
              signers: [owner],
            },
          ),
        )
        .to.eventually.be.rejectedWith(Error);
    });

    it('Create a dialect for 2 members, with owner and write scopes, respectively', async () => {
      await createDialect(program, owner, members);
    });

    it('Fail to create a second dialect for the same members', async () => {
      chai
        .expect(createDialect(program, owner, members))
        .to.eventually.be.rejectedWith(Error);
    });

    it('Fail to create a dialect for duplicate members', async () => {
      const duplicateMembers = [
        { publicKey: owner.publicKey, scopes: [true, true] } as Member,
        { publicKey: owner.publicKey, scopes: [true, true] } as Member,
      ];
      chai
        .expect(createDialect(program, owner, duplicateMembers))
        .to.be.rejectedWith(Error);
    });

    it('Find a dialect for a given member pair, verify correct scopes.', async () => {
      await createDialect(program, owner, members);
      const dialect = await getDialectForMembers(program, members, writer);
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
      const dialect = await createDialect(program, owner, members);
      // owner subscribes themselves
      await subscribeUser(program, dialect, owner.publicKey, owner);
      // owner subscribes writer
      await subscribeUser(program, dialect, writer.publicKey, owner);
      const ownerMeta = await getMetadata(program, owner.publicKey);
      const writerMeta = await getMetadata(program, writer.publicKey);
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
      console.log('Creating dialects');
      // create first dialect and subscribe users
      const dialect1 = await createDialectAndSubscribeAllMembers(
        program,
        user1,
        user2,
      );
      const dialect2 = await createDialectAndSubscribeAllMembers(
        program,
        user1,
        user3,
      );
      // when
      const afterCreatingDialects = await getDialects(program, user1);
      await sleep(3000); // wait a bit to avoid equal timestamp, since since we get utc seconds as a timestamp
      await sendMessage(
        program,
        dialect1,
        user1,
        'Dummy message to increment latest message timestamp',
      );
      const afterSendingMessageToDialect1 = await getDialects(program, user1);
      await sleep(3000); // wait a bit to avoid equal timestamp, since since we get utc seconds as a timestamp
      await sendMessage(
        program,
        dialect2,
        user1,
        'Dummy message to increment latest message timestamp',
      );
      const afterSendingMessageToDialect2 = await getDialects(program, user1);
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

    //   it('Non-owners fail to close the dialect account', async () => {
    //     chai.expect(true).to.be.true;
    //   });
    //
    //   it('Owner closes the dialect account', async () => {
    //     chai.expect(true).to.be.true;
    //   });
    //
    // });
    it('Fail to subscribe a user twice to the same dialect (silent, noop)', async () => {
      const dialect = await createDialect(program, owner, members);
      await subscribeUser(program, dialect, writer.publicKey, owner);
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
        .expect(subscribeUser(program, dialect, writer.publicKey, owner))
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

  describe('Messaging tests', () => {
    let owner: web3.Keypair;
    let writer: web3.Keypair;
    let nonmember: web3.Keypair;
    let members: Member[] = [];
    let dialect: DialectAccount;

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
      dialect = await createDialect(program, owner, members);
    });

    it('Message sender can send msg and then read the message text and time', async () => {
      // given
      const dialect = await getDialectForMembers(program, members, writer);
      const text = generateRandomText(256);
      // when
      await sendMessage(program, dialect, writer, text);
      // then
      const senderDialect = await getDialectForMembers(
        program,
        dialect.dialect.members,
        writer,
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
      const senderDialect = await getDialectForMembers(
        program,
        members,
        writer,
      );
      const text = generateRandomText(256);
      // when
      await sendMessage(program, senderDialect, writer, text);
      // then
      const receiverDialect = await getDialectForMembers(
        program,
        dialect.dialect.members,
        owner,
      );
      const message = receiverDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai.expect(message.owner).to.be.deep.eq(writer.publicKey);
      chai
        .expect(receiverDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it('Can send and receive unicode', async () => {
      // given
      const dialect = await getDialectForMembers(program, members, writer);
      const text = 'Hello world! Привет, мир! 你好世界! 😂 😍 ❤️ 👍 ✓ 🔥';
      // when
      await sendMessage(program, dialect, writer, text);
      // then
      const senderDialect = await getDialectForMembers(
        program,
        dialect.dialect.members,
        writer,
      );
      const message = senderDialect.dialect.messages[0];
      chai.expect(message.text).to.be.eq(text);
      chai
        .expect(senderDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it("Non-member can't read (decrypt) any of the messages", async () => {
      // given
      const senderDialect = await getDialectForMembers(
        program,
        members,
        writer,
      );
      const text = generateRandomText(256);
      await sendMessage(program, senderDialect, writer, text);
      // when / then
      expect(getDialectForMembers(program, dialect.dialect.members, nonmember))
        .to.eventually.be.rejected;
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
        const dialect = await getDialectForMembers(program, members, writer);
        console.log(
          `Sending message ${messageCounter}/${texts.length}
    len = ${text.length}
    idx: ${dialect.dialect.nextMessageIdx}`,
        );
        await sendMessage(program, dialect, writer, text);
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
        const d = await getDialect(program, dialect.publicKey, writer);
        const actualMessages = d.dialect.messages.map((m) => m.text);
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        expect(actualMessages).to.be.deep.eq(expectedMessages);
      }
    });

    it('Send/receive random size messages.', async () => {
      const texts = Array(32)
        .fill(0)
        .map(() => generateRandomText(randomInt(256, 512)));
      for (let messageIdx = 0; messageIdx < texts.length; messageIdx++) {
        const text = texts[messageIdx];
        const messageCounter = messageIdx + 1;
        const dialect = await getDialectForMembers(program, members, writer);
        console.log(
          `Sending message ${messageCounter}/${texts.length}
    len = ${text.length}
    idx: ${dialect.dialect.nextMessageIdx}`,
        );
        // when
        await sendMessage(program, dialect, writer, text);
        const d = await getDialect(program, dialect.publicKey, writer);
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
        const dialect = await getDialectForMembers(program, members, writer);
        console.log(
          `Sending message ${messageCounter}/${texts.length}
  len = ${text.length}
  idx: ${dialect.dialect.nextMessageIdx}`,
        );
        // when
        await sendMessage(program, dialect, writer, text);
        const d = await getDialect(program, dialect.publicKey, writer);
        const actualMessages = d.dialect.messages;
        const lastMessage = actualMessages[0];
        console.log(`  msgs count after send: ${actualMessages.length}\n`);
        // then
        expect(lastMessage.text).to.be.deep.eq(text);
      }
    });

    it('2 writers can send a messages and read them when dialect state is linearized before sending msg', async () => {
      // given
      const writer1 = await createUser({
        requestAirdrop: true,
        createMeta: true,
      });
      const writer2 = await createUser({
        requestAirdrop: true,
        createMeta: true,
      });
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
      await createDialect(program, writer1, members);
      // when
      let writer1Dialect = await getDialectForMembers(
        program,
        members,
        writer1,
      );
      const writer1Text = generateRandomText(256);
      await sendMessage(program, writer1Dialect, writer1, writer1Text);
      let writer2Dialect = await getDialectForMembers(
        program,
        members,
        writer2,
      ); // ensures dialect state linearization
      const writer2Text = generateRandomText(256);
      await sendMessage(program, writer2Dialect, writer2, writer2Text);

      writer1Dialect = await getDialectForMembers(program, members, writer1);
      writer2Dialect = await getDialectForMembers(program, members, writer2);

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
      const writer1 = await createUser({
        requestAirdrop: true,
        createMeta: true,
      });
      const writer2 = await createUser({
        requestAirdrop: true,
        createMeta: true,
      });
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
      await createDialect(program, writer1, members);
      // when
      let writer1Dialect = await getDialectForMembers(
        program,
        members,
        writer1,
      );
      let writer2Dialect = await getDialectForMembers(
        program,
        members,
        writer2,
      ); // ensures no dialect state linearization
      const writer1Text = generateRandomText(256);
      await sendMessage(program, writer1Dialect, writer1, writer1Text);
      const writer2Text = generateRandomText(256);
      await sendMessage(program, writer2Dialect, writer2, writer2Text);

      writer1Dialect = await getDialectForMembers(program, members, writer1);
      writer2Dialect = await getDialectForMembers(program, members, writer2);

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

    // it('All writers can send a message', async () => {
    //   chai.expect(true).to.be.true;
    // });
    //
    // it('Fails to send a message longer than the character limit', async () => {
    //   chai.expect(true).to.be.true;
    // });
    //
    // it('Owner fails to send a message', async () => {
    //   chai.expect(true).to.be.true;
    // });
    //
    // it('Non-member can\'t read (decrypt) any of the messages', async () => {
    //
  });

  async function createUser(
    { requestAirdrop, createMeta }: CreateUserOptions = {
      requestAirdrop: true,
      createMeta: true,
    },
  ) {
    const user = web3.Keypair.generate();
    if (requestAirdrop) {
      const airDropRequest = await connection.requestAirdrop(
        user.publicKey,
        10 * web3.LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(airDropRequest);
    }
    if (createMeta) {
      const deviceToken = 'a'.repeat(DEVICE_TOKEN_LENGTH);
      await createMetadata(program, user);
      await updateDeviceToken(
        program,
        user,
        dialectKeypair.publicKey,
        deviceToken,
      );
    }
    return user;
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

async function createDialectAndSubscribeAllMembers(
  program: Program,
  owner: anchor.web3.Keypair,
  member: anchor.web3.Keypair,
) {
  const members: Member[] = [
    {
      publicKey: owner.publicKey,
      scopes: [true, true], // owner, read-only
    },
    {
      publicKey: member.publicKey,
      scopes: [false, true], // non-owner, read-write
    },
  ];
  const dialect = await createDialect(program, owner, members);
  await subscribeUser(program, dialect, owner.publicKey, owner);
  await subscribeUser(program, dialect, member.publicKey, member);
  return dialect;
}
