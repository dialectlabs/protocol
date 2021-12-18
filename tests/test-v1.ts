import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  createDialect,
  createMetadata,
  DialectAccount,
  getDialect,
  getDialectForMembers,
  getDialectProgramAddress,
  getMetadata, MAX_MESSAGE_SIZE,
  Member,
  MESSAGES_PER_DIALECT,
  sendMessage,
} from '../src/api';
import { waitForFinality } from '../src/utils';

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
      const deviceToken = 'a'.repeat(32);
      for (const member of [owner, writer]) {
        const metadata = await createMetadata(program, member, deviceToken);
        const gottenMetadata = await getMetadata(program, member.publicKey);
        expect(metadata.deviceToken.toString()).to.be.eq(deviceToken);
        expect(gottenMetadata.deviceToken.toString()).to.be.eq(deviceToken);
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

    it('Transfers funds to writer\'s account', async () => {
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
          m.scopes.every((s, j) => s === dialect.dialect.members[i].scopes[j]),
        ),
      );
    });
    //
    //   it('Non-owners fail to close the dialect account', async () => {
    //     chai.expect(true).to.be.true;
    //   });
    //
    //   it('Owner closes the dialect account', async () => {
    //     chai.expect(true).to.be.true;
    //   });
    //
    // });

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
        const senderDialect = await getDialectForMembers(program, dialect.dialect.members, writer);
        const message = senderDialect.dialect.messages[0];
        chai.expect(message.text).to.be.eq(text);
        chai.expect(senderDialect.dialect.lastMessageTimestamp).to
          .be.eq(message.timestamp);
      });

      it('Message sender can send and then read the correct next message idx', async () => {
        // given
        const dialect = await getDialectForMembers(program, members, writer);
        const text = generateRandomText(MAX_MESSAGE_SIZE);
        // when
        await sendMessage(program, dialect, writer, text);
        // then
        const senderDialect = await getDialectForMembers(program, dialect.dialect.members, writer);
        chai.expect(senderDialect.dialect.nextMessageIdx).to.be.eq(1);
      });

      it('Message receiver can read the message text and time sent by sender', async () => {
        // given
        const senderDialect = await getDialectForMembers(program, members, writer);
        const text = generateRandomText(MAX_MESSAGE_SIZE);
        // when
        await sendMessage(program, senderDialect, writer, text);
        // then
        const receiverDialect = await getDialectForMembers(program, dialect.dialect.members, owner);
        const message = receiverDialect.dialect.messages[0];
        chai.expect(message.text).to.be.eq(text);
        chai.expect(receiverDialect.dialect.lastMessageTimestamp).to
          .be.eq(message.timestamp);
      });

      it('Message receiver can read the correct next message idx after receiving message', async () => {
        // given
        const senderDialect = await getDialectForMembers(program, members, writer);
        const text = generateRandomText(MAX_MESSAGE_SIZE);
        // when
        await sendMessage(program, senderDialect, writer, text);
        // then
        const receiverDialect = await getDialectForMembers(program, dialect.dialect.members, owner);
        chai.expect(receiverDialect.dialect.nextMessageIdx).to.be.eq(1);
      });

      it('Non-member can\'t read (decrypt) any of the messages', async () => {
        // given
        const senderDialect = await getDialectForMembers(program, members, writer);
        const text = generateRandomText(MAX_MESSAGE_SIZE);
        await sendMessage(program, senderDialect, writer, text);
        // when / then
        expect(getDialectForMembers(program, dialect.dialect.members, nonmember)).to.eventually.be.rejected;
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
          const sliceStart = messageCounter <= MESSAGES_PER_DIALECT ? 0 : messageCounter - MESSAGES_PER_DIALECT;
          const expectedMessagesCount = Math.min(messageCounter, MESSAGES_PER_DIALECT);
          const sliceEnd = sliceStart + expectedMessagesCount;
          const expectedMessages = texts.slice(sliceStart, sliceEnd)
            .reverse();
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

    });

    async function createUser({
                                requestAirdrop,
                                createMeta,
                              }: CreateUserOptions = {
      requestAirdrop: true,
      createMeta: true,
    }) {
      const user = web3.Keypair.generate();
      if (requestAirdrop) {
        const airDropRequest = await connection.requestAirdrop(
          user.publicKey,
          10 * web3.LAMPORTS_PER_SOL,
        );
        await connection.confirmTransaction(airDropRequest);
      }
      if (createMeta) {
        const deviceToken = 'a'.repeat(32);
        await createMetadata(program, user, deviceToken);
      }
      return user;
    }
  });


  interface CreateUserOptions {
    requestAirdrop: boolean,
    createMeta: boolean,
  }

  function generateRandomText(maxLength: number) {
    let result = '';
    const targetLen = randomIntFromInterval(maxLength / 2, maxLength);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < targetLen; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        characters.length));
    }
    return result;
  }

  function randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
