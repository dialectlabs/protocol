import * as anchor from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createMintDialect, getMintDialectProgramAddress } from '../src/api';

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

  it('Create a new fungible mint & token account', async () => {
    const fromAirdropSignature = await connection.requestAirdrop(
      senderKeypair.publicKey,
      web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(fromAirdropSignature);

    mint = await splToken.Token.createMint(
      connection,
      senderKeypair,
      senderKeypair.publicKey,
      null,
      9,
      splToken.TOKEN_PROGRAM_ID
    );
    const mintInfo = await mint.getMintInfo();
    assert.equal(
      mintInfo.mintAuthority?.toString(),
      senderKeypair.publicKey.toString()
    );

    senderTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      senderKeypair.publicKey
    );

    assert.equal(senderTokenAccount.amount.toString(), '0');
    await mint.mintTo(
      senderTokenAccount.address,
      senderKeypair.publicKey,
      [],
      mintAmount
    );

    // refresh
    senderTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      senderKeypair.publicKey
    );
    assert.equal(senderTokenAccount.amount.toString(), mintAmount.toString());
  });

  it('Create a dialect for the fungible token', async () => {
    const dialectAccount = await createMintDialect(
      program,
      mint,
      senderKeypair
    );
    assert.equal(
      dialectAccount.dialect.mint.toString(),
      mint.publicKey.toString()
    );
  });

  it('Fail to create a second dialect for the same fungible token', async () => {
    chai
      .expect(createMintDialect(program, mint, senderKeypair))
      .to.eventually.be.rejectedWith(Error);
  });

  it('Fail to create a dialect as non-mint authority', async () => {
    chai
      .expect(createMintDialect(program, mint, receiverKeypair))
      .to.eventually.be.rejectedWith(Error);
  });

  it('Fail to create a dialect for a non-mint account', async () => {
    const nonMintKeypair = web3.Keypair.generate();
    const [dialectPubkey, dialectNonce] = await getMintDialectProgramAddress(
      program,
      mint
    );
    chai
      .expect(
        program.rpc.createMintDialect(new anchor.BN(dialectNonce), {
          accounts: {
            dialect: dialectPubkey,
            mint: nonMintKeypair.publicKey,
            mintAuthority: senderKeypair.publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [senderKeypair],
        })
      )
      .to.eventually.be.rejectedWith(Error);
  });

  it('Get members, expect it to be 1', async () => {
    // TODO: Implement
    chai.expect(true).to.be.true;
  });

  it('Transfer one token to the receiver', async () => {
    receiverTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      receiverKeypair.publicKey
    );
    assert.equal(receiverTokenAccount.amount.toString(), '0');

    const transaction = new web3.Transaction().add(
      splToken.Token.createTransferInstruction(
        splToken.TOKEN_PROGRAM_ID,
        senderTokenAccount.address,
        receiverTokenAccount.address,
        senderKeypair.publicKey,
        [],
        1
      )
    );

    await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair],
      { commitment: 'confirmed' }
    );

    // refresh
    senderTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      senderKeypair.publicKey
    );
    receiverTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      receiverKeypair.publicKey
    );
    assert.equal(
      senderTokenAccount.amount.toString(),
      (mintAmount - 1).toString()
    );
    assert.equal(receiverTokenAccount.amount.toString(), '1');
  });

  it('Get members, expect it to be 2', async () => {
    // TODO: Implement
    chai.expect(true).to.be.true;
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

  it('Transfer authority to another wallet', async () => {
    chai.expect(true).to.be.true;
  });

  it('New authority can now send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('All token holders can still read all messages', async () => {
    chai.expect(true).to.be.true;
  });

  it('Old authority fails to send a message', async () => {
    chai.expect(true).to.be.true;
  });

  it('Close the account (TBD)', async () => {
    chai.expect(true).to.be.true;
  });
});
