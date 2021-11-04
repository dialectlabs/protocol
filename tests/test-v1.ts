import * as anchor from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createDialect, getDialectProgramAddress } from '../src/api';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const program = anchor.workspace.Dialect;
const connection = program.provider.connection;
const members = Array(8).fill(0).map(() => web3.Keypair.generate());

// TODO: Remove test interdependence with fixtures
describe('Test messaging with a standard dialect', () => {

  it('Fund owner\'s account', async () => {
    const fromAirdropSignature = await connection.requestAirdrop(
      members[0].publicKey,
      web3.LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(fromAirdropSignature);
  });

  it('Create a dialect for 8 members, with various scopes', async () => {
    await createDialect(program, members[0], members.map(m => m.publicKey));
  });

  it('Fail to create a second dialect for the same members', async () => {
    chai.expect(true).to.be.true;
  });

  it('Fail to create a second dialect for unsorted members', async () => {
    chai.expect(true).to.be.true;
  });

  it('Get members, verify it\'s the right 8 with correct scopes', async () => {
    // TODO: Implement
    chai.expect(true).to.be.true;
  });

  it('Owner sends a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('All members can read the message', async () => {
    // N.b. of course non-token holders can as well
    chai.expect(true).to.be.true;
  });

  it('All writers can send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('All readers fail to send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('Non-member can\'t read (decrypt) any of the messages', async () => {
    chai.expect(true).to.be.true;
  });

  it('Non-owners fail to close the dialect account', async () => {
    chai.expect(true).to.be.true;
  });

  it('Owner closes the dialect account', async () => {
    chai.expect(true).to.be.true;
  });

});
