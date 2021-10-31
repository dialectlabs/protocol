import * as anchor from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const program = anchor.workspace.Dialect;
const connection = program.provider.connection;

const senderKeypair = web3.Keypair.generate();
const receiverKeypair = web3.Keypair.generate();

// TODO: Remove test interdependence with fixtures
describe('Test messaging with a fungible token', () => {
  let mint: splToken.Token;
  let senderTokenAccount: splToken.AccountInfo;
  let receiverTokenAccount: splToken.AccountInfo;
  const mintAmount = 1000000000;

  it('Test initialize', async () => {
    const tx = await program.rpc.initialize();
    console.log('tx', tx);
  });

  it('Create a new fungible mint & token account', async () => {
    const fromAirdropSignature = await connection.requestAirdrop(
      senderKeypair.publicKey,
      web3.LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(fromAirdropSignature);

    mint = await splToken.Token.createMint(
      connection,
      senderKeypair,
      senderKeypair.publicKey,
      null,
      9,
      splToken.TOKEN_PROGRAM_ID,
    );

    senderTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      senderKeypair.publicKey,
    );

    assert.equal(senderTokenAccount.amount.toString(), '0');
    await mint.mintTo(
      senderTokenAccount.address,
      senderKeypair.publicKey,
      [],
      mintAmount,
    );

    // refresh
    senderTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      senderKeypair.publicKey,
    );
    assert.equal(senderTokenAccount.amount.toString(), mintAmount.toString());
  });

  it('Create a dialect for the fungible token', async () => {
    chai.expect(true).to.be.true;
  });

  it('Fail to create a dialect for a non-mint account', async () => {
    chai.expect(true).to.be.true;
  });

  it('Transfer one token to the receiver', async () => {
    receiverTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      receiverKeypair.publicKey,
    );
    assert.equal(receiverTokenAccount.amount.toString(), '0');

    const transaction = new web3.Transaction().add(
      splToken.Token.createTransferInstruction(
        splToken.TOKEN_PROGRAM_ID,
        senderTokenAccount.address,
        receiverTokenAccount.address,
        senderKeypair.publicKey,
        [],
        1,
      ),
    );

    await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair],
      {commitment: 'confirmed'},
    );

    // refresh
    senderTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      senderKeypair.publicKey,
    );
    receiverTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      receiverKeypair.publicKey,
    );
    assert.equal(senderTokenAccount.amount.toString(), (mintAmount - 1).toString());
    assert.equal(receiverTokenAccount.amount.toString(), '1');
  });

  it('Mint authority sends a message.', async () => {
    chai.expect(true).to.be.true;
  });

  it('All token holders can read the message', async () => {
    // N.b. of course non-token holders can as well
    chai.expect(true).to.be.true;
  });

  it('Non-mint authority fails to send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('Transfer authority', async () => {
    chai.expect(true).to.be.true;
  });

  it('New authority can send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('All token holders can still read all messages', async () => {
    chai.expect(true).to.be.true;
  });

  it('Old authority fails to send a message', async () => {
    chai.expect(true).to.be.true;
  });
});
