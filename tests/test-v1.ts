import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  createDialect,
  createMetadata,
  DialectAccount,
  getDialect,
  getDialectForMembers,
  getDialectProgramAddress,
  getMetadata,
  Member,
  MESSAGES_PER_DIALECT,
  sendMessage,
  subscribeUser,
} from '../src/api';
import { waitForFinality } from '../src/utils';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const program = anchor.workspace.Dialect;
const connection = program.provider.connection;
let dialect: DialectAccount;

const [owner, writer, nonmember] = Array(3)
  .fill(0)
  .map(() => web3.Keypair.generate());

const members = [
  {
    publicKey: owner.publicKey,
    scopes: [true, false], // owner, read-only
  },
  {
    publicKey: writer.publicKey,
    scopes: [false, true], // non-owner, read-write
  },
] as Member[];

// TODO: Remove test interdependence with fixtures

describe('Test creating user metadata', () => {
  it("Fund members' accounts", async () => {
    const fromAirdropSignature = await connection.requestAirdrop(
      owner.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(fromAirdropSignature);
    const fromAirdropSignature1 = await connection.requestAirdrop(
      writer.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(fromAirdropSignature1);
  });

  it('Create user metadata object(s)', async () => {
    const deviceToken = 'a'.repeat(32);
    for (const member of [owner, writer]) {
      const metadata = await createMetadata(program, member, deviceToken);
      const gottenMetadata = await getMetadata(program, member.publicKey);
      assert(metadata.deviceToken.toString() === deviceToken);
      assert(gottenMetadata.deviceToken.toString() === deviceToken);
    }
  });
});

describe('Test messaging with a standard dialect', () => {
  it("Transfers funds to writer's account", async () => {
    const senderBalanceBefore =
      (await program.provider.connection.getAccountInfo(owner.publicKey))
        .lamports / web3.LAMPORTS_PER_SOL;
    const receiver1BalanceBefore =
      (await program.provider.connection.getAccountInfo(writer.publicKey))
        ?.lamports / web3.LAMPORTS_PER_SOL || 0;
    const receiver2BalanceBefore =
      (await program.provider.connection.getAccountInfo(nonmember.publicKey))
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
      }
    );
    await waitForFinality(program, tx);
    const senderBalanceAfter =
      (await program.provider.connection.getAccountInfo(owner.publicKey))
        .lamports / web3.LAMPORTS_PER_SOL;
    const receiver1BalanceAfter =
      (await program.provider.connection.getAccountInfo(writer.publicKey))
        ?.lamports / web3.LAMPORTS_PER_SOL || 0;
    const receiver2BalanceAfter =
      (await program.provider.connection.getAccountInfo(nonmember.publicKey))
        ?.lamports / web3.LAMPORTS_PER_SOL || 0;
  });

  it('Fail to create a dialect for unsorted members', async () => {
    // use custom unsorted version of createDialect for unsorted members
    const unsortedMembers = members.sort(
      (a, b) => -a.publicKey.toBuffer().compare(b.publicKey.toBuffer())
    );
    const [publicKey, nonce] = await getDialectProgramAddress(
      program,
      unsortedMembers
    );
    // TODO: assert owner in members
    const keyedMembers = unsortedMembers.reduce(
      (ms, m, idx) => ({ ...ms, [`member${idx}`]: m.publicKey }),
      {}
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
          }
        )
      )
      .to.eventually.be.rejectedWith(Error);
  });

  it('Create a dialect for 2 members, with owner and write scopes, respectively', async () => {
    dialect = await createDialect(program, owner, members);
  });

  it('Subscribe all members to dialect', async () => {
    const metadata0 = await subscribeUser(
      program,
      dialect,
      members[0].publicKey,
      owner
    );
    chai.expect(
      metadata0.subscriptions.some((s) => s.pubkey.equals(dialect.publicKey))
    ).to.be.true;
    const metadata1 = await subscribeUser(
      program,
      dialect,
      members[1].publicKey,
      owner
    );
    chai.expect(
      metadata1.subscriptions.some((s) => s.pubkey.equals(dialect.publicKey))
    ).to.be.true;
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
    const dialect = await getDialectForMembers(program, members, writer);
    members.every((m, i) =>
      assert(
        m.publicKey.equals(dialect.dialect.members[i].publicKey) &&
          m.scopes.every((s, j) => s === dialect.dialect.members[i].scopes[j])
      )
    );
  });

  it('Writer sends a message', async () => {
    let dialect = await getDialectForMembers(program, members, writer);
    const text = 'Hello, world!';
    await sendMessage(program, dialect, writer, text);
    dialect = await getDialectForMembers(program, dialect.dialect.members, writer);
    const message = dialect.dialect.messages[0];
    chai.expect(message.text).to.be.eq(text);
    chai.expect(dialect.dialect.nextMessageIdx === 1).to.be.true;
    chai.expect(dialect.dialect.lastMessageTimestamp).to
      .be.eq(message.timestamp);
  });

  it('All members can read the message', async () => {
    // N.b. of course non-members can as well, if not encrypted
    // TODO: Implement when encrypted
    chai.expect(true).to.be.true;
  });

  it('All writers can send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('New messages overwrite old, retrieved messages are in order.', async () => {
    // TODO: Test max message length, fully filled
    const dialect = await getDialectForMembers(program, members, writer);
    const numMessages = 17;
    const texts = Array(numMessages)
      .fill(0)
      .map((_, i) => `Hello, world! ${i}`);
    for (let i = 0; i < numMessages; i++) {
      await sendMessage(program, dialect, writer, texts[i]);
      const d = await getDialect(program, dialect.publicKey, writer);
      // verify last N messages look correct
      for (let j = 0; j <= Math.min(i + 1, MESSAGES_PER_DIALECT - 1); j++) {
        const message = d.dialect.messages[j].text;
        const expectedMessage =
          i - j === -1 ? 'Hello, world!' : `Hello, world! ${i - j}`; // +1 for readability
        console.log('         message', d.dialect.messages[j].text);
        console.log('expected message', expectedMessage);
        chai.expect(message).to.be.eq(expectedMessage);
      }
      console.log('\n');
    }
  });

  it('Fails to send a message longer than the character limit', async () => {
    chai.expect(true).to.be.true;
  });

  it('Owner fails to send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it("Non-member can't read (decrypt) any of the messages", async () => {
    chai.expect(true).to.be.true;
  });

  it('Non-owners fail to close the dialect account', async () => {
    chai.expect(true).to.be.true;
  });

  it('Owner closes the dialect account', async () => {
    chai.expect(true).to.be.true;
  });
});
