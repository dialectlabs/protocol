const { it, describe } = require('mocha');
const anchor = require('@project-serum/anchor');
const assert = require('assert');

describe('test-print-message', () => {
  anchor.setProvider(anchor.Provider.local());

  it('calls print_message to print a message on chain', async () => {
    const program = anchor.workspace.Dialect;
    const threadsAccount = anchor.web3.Keypair.generate();
    const message =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZacbcdefghijklmnopqrstuvwxyz0123456789';
    await program.rpc.createUserThreadsAccount(message, {
      accounts: {
        threadsAccount: threadsAccount.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [threadsAccount],
      instructions: [
        await program.account.threadsData.createInstruction(threadsAccount),
      ],
    });
    const thread = await program.account.threadsData.fetch(
      threadsAccount.publicKey
    );
    const returnedMessage = new TextDecoder('utf-8').decode(
      new Uint8Array(thread.message)
    );
    assert.ok(returnedMessage.startsWith(message)); // [u8; 280] => trailing zeros.
  });
});
