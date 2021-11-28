import * as anchor from '@project-serum/anchor';
import * as web3 from '@solana/web3.js';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createDialect, getDialectForMembers, getDialectProgramAddress, Member } from '../src/api';
import { waitForFinality } from '../src/utils';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const program = anchor.workspace.Dialect;
const connection = program.provider.connection;

const [owner, writer, nonmember] = Array(3).fill(0).map(() => web3.Keypair.generate());

const members = [{
  publicKey: owner.publicKey,
  scopes: [true, false], // owner, read-only
}, {
  publicKey: writer.publicKey,
  scopes: [false, true], // non-owner, read-write
}] as Member[];

// TODO: Remove test interdependence with fixtures
describe('Test messaging with a standard dialect', () => {

  it('Fund owner\'s account', async () => {
    const fromAirdropSignature = await connection.requestAirdrop(
      owner.publicKey,
      10 * web3.LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(fromAirdropSignature);
  });

  it('Transfers funds to writer\'s account', async () => {
    const senderBalanceBefore = (await program.provider.connection.getAccountInfo(owner.publicKey)).lamports / web3.LAMPORTS_PER_SOL;
    console.log('senderbalancebefore', senderBalanceBefore);
    const receiver1BalanceBefore = (await program.provider.connection.getAccountInfo(writer.publicKey))?.lamports / web3.LAMPORTS_PER_SOL || 0;
    console.log('receiver1balancebefore', receiver1BalanceBefore);
    const receiver2BalanceBefore = (await program.provider.connection.getAccountInfo(nonmember.publicKey))?.lamports / web3.LAMPORTS_PER_SOL || 0;
    console.log('receiver2balancebefore', receiver2BalanceBefore);
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
    const senderBalanceAfter = (await program.provider.connection.getAccountInfo(owner.publicKey)).lamports / web3.LAMPORTS_PER_SOL;
    console.log('senderbalanceAfter', senderBalanceAfter);
    const receiver1BalanceAfter = (await program.provider.connection.getAccountInfo(writer.publicKey))?.lamports / web3.LAMPORTS_PER_SOL || 0;
    console.log('receiverbalanceAfter', receiver1BalanceAfter);
    const receiver2BalanceAfter = (await program.provider.connection.getAccountInfo(nonmember.publicKey))?.lamports / web3.LAMPORTS_PER_SOL || 0;
    console.log('receiverbalanceAfter', receiver2BalanceAfter);
  });

  // it('Fail to create a dialect for unsorted members', async () => {
  //   // use custom unsorted version of createDialect for unsorted members
  //   const unsortedMembers = members.sort((a, b) => -a.publicKey.toBuffer().compare(b.publicKey.toBuffer()));
  //   const [publicKey, nonce] = await getDialectProgramAddress(program, unsortedMembers);
  //   // TODO: assert owner in members
  //   const keyedMembers = unsortedMembers.reduce((ms, m, idx) => ({...ms, [`member${idx}`]: m.publicKey}), {});
  //   chai.expect(program.rpc.createDialect(
  //     new anchor.BN(nonce),
  //     members.map(m => m.scopes),
  //     {
  //       accounts: {
  //         dialect: publicKey,
  //         owner: owner.publicKey,
  //         ...keyedMembers,
  //         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       },
  //       signers: [owner],
  //     }
  //   )).to.eventually.be.rejectedWith(Error);
  //   // await waitForFinality(program, tx);
  // });

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
      {publicKey: owner.publicKey, scopes: [true, true]} as Member,
      {publicKey: owner.publicKey, scopes: [true, true]} as Member,
    ];
    chai.expect(createDialect(program, owner, duplicateMembers)).to.be.rejectedWith(Error);
    // chai.expect(true).to.be.true;
  });

  // it('Find a dialect for a given member pair, verify correct scopes.', async () => {
  //   const dialect = await getDialectForMembers(program, members);
  //   members.every((m, i) => (assert(
  //     m.publicKey.equals(dialect.dialect.members[i].pubkey) &&
  //     m.scopes.every((s, j) => s === dialect.dialect.members[i].scopes[j])
  //   )));
  // });

  // it('Writer sends a message', async () => {
  //   chai.expect(true).to.be.true;
  // });

  // it('All members can read the message', async () => {
  //   // N.b. of course non-token holders can as well
  //   chai.expect(true).to.be.true;
  // });

  // it('All writers can send a message', async () => {
  //   chai.expect(true).to.be.true;
  // });

  // it('Owner fails to send a message', async () => {
  //   chai.expect(true).to.be.true;
  // });

  // it('Non-member can\'t read (decrypt) any of the messages', async () => {
  //   chai.expect(true).to.be.true;
  // });

  // it('Non-owners fail to close the dialect account', async () => {
  //   chai.expect(true).to.be.true;
  // });

  // it('Owner closes the dialect account', async () => {
  //   chai.expect(true).to.be.true;
  // });

});
