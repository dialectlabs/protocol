import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as anchor from '@project-serum/anchor';
import assert from 'assert';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Dialect;

async function _createUserThreadsAccount(pk: anchor.web3.PublicKey, nonce: number) {
  await PROGRAM.rpc.createUserThreadsAccount(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: PROGRAM.provider.wallet.publicKey,
        threadsAccount: pk,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    }
  );
}

describe('test create_user_threads_account', () => {
  let threadspk: anchor.web3.PublicKey;
  let nonce: number;
  it('creates a threads account for the user', async () => {
    const [_threadspk, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [
        PROGRAM.provider.wallet.publicKey.toBuffer(),
        'threads_account',
      ],
      PROGRAM.programId,
    );
    threadspk = _threadspk;
    nonce = _nonce;

    await _createUserThreadsAccount(threadspk, nonce);
    const threadsAccount = await PROGRAM.account.threadsAccount.fetch(threadspk);
    assert.ok(threadsAccount.owner.toString() === PROGRAM.provider.wallet.publicKey.toString());
    assert.ok(threadsAccount.threads.length === 0);
  });

  it('should fail to create a threads account a second time for the user', async () => {
    chai
      .expect(_createUserThreadsAccount(threadspk, nonce))
      .to.eventually.be.rejectedWith(Error);
  });
});
