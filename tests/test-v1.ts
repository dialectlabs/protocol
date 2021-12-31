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
  MAX_MESSAGE_SIZE,
  Member,
  MESSAGES_PER_DIALECT,
  sendMessage,
  subscribeUser,
  updateDeviceToken,
} from '../src/api';
import { waitForFinality } from '../src/utils';
import { sleep } from '../lib/es';

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
      const text = generateRandomText(MAX_MESSAGE_SIZE);
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

    it('Message sender can send and then read the correct next message idx', async () => {
      // given
      const dialect = await getDialectForMembers(program, members, writer);
      const text = generateRandomText(MAX_MESSAGE_SIZE);
      // when
      await sendMessage(program, dialect, writer, text);
      // then
      const senderDialect = await getDialectForMembers(
        program,
        dialect.dialect.members,
        writer,
      );
      chai.expect(senderDialect.dialect.nextMessageIdx).to.be.eq(1);
    });

    it('Message receiver can read the message text and time sent by sender', async () => {
      // given
      const senderDialect = await getDialectForMembers(
        program,
        members,
        writer,
      );
      const text = generateRandomText(MAX_MESSAGE_SIZE);
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
      chai
        .expect(receiverDialect.dialect.lastMessageTimestamp)
        .to.be.eq(message.timestamp);
    });

    it('Message receiver can read the correct next message idx after receiving message', async () => {
      // given
      const senderDialect = await getDialectForMembers(
        program,
        members,
        writer,
      );
      const text = generateRandomText(MAX_MESSAGE_SIZE);
      // when
      await sendMessage(program, senderDialect, writer, text);
      // then
      const receiverDialect = await getDialectForMembers(
        program,
        dialect.dialect.members,
        owner,
      );
      chai.expect(receiverDialect.dialect.nextMessageIdx).to.be.eq(1);
    });

    it("Non-member can't read (decrypt) any of the messages", async () => {
      // given
      const senderDialect = await getDialectForMembers(
        program,
        members,
        writer,
      );
      const text = generateRandomText(MAX_MESSAGE_SIZE);
      await sendMessage(program, senderDialect, writer, text);
      // when / then
      expect(getDialectForMembers(program, dialect.dialect.members, nonmember))
        .to.eventually.be.rejected;
    });

    it('New messages overwrite old, retrieved messages are in order.', async () => {
      const numMessages = MESSAGES_PER_DIALECT * 2;
      const texts = Array(numMessages)
        .fill(0)
        .map(() => generateRandomText(MAX_MESSAGE_SIZE));
      for (let messageIdx = 0; messageIdx < numMessages; messageIdx++) {
        // verify last last N messages look correct
        const messageCounter = messageIdx + 1;
        console.log(`Message ${messageCounter}/${numMessages}`);
        const dialect = await getDialectForMembers(program, members, writer);
        await sendMessage(program, dialect, writer, texts[messageIdx]);
        const sliceStart =
          messageCounter <= MESSAGES_PER_DIALECT
            ? 0
            : messageCounter - MESSAGES_PER_DIALECT;
        const expectedMessagesCount = Math.min(
          messageCounter,
          MESSAGES_PER_DIALECT,
        );
        const sliceEnd = sliceStart + expectedMessagesCount;
        const expectedMessages = texts.slice(sliceStart, sliceEnd).reverse();
        const d = await getDialect(program, dialect.publicKey, writer);
        const actualMessages = d.dialect.messages.map((m) => m.text);
        expect(actualMessages).to.be.deep.eq(expectedMessages);
      }
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
      await updateDeviceToken(program, user, deviceToken);
    }
    return user;
  }
});

interface CreateUserOptions {
  requestAirdrop: boolean;
  createMeta: boolean;
}

function generateRandomText(maxLength: number) {
  let result = '';
  const targetLen = randomIntFromInterval(maxLength / 2, maxLength);
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < targetLen; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
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
