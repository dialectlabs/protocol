import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as anchor from '@project-serum/anchor';
import assert from 'assert';

chai.use(chaiAsPromised);
anchor.setProvider(anchor.Provider.local());
const PROGRAM = anchor.workspace.Dialect;

async function _createUserSettingsAccount(
  pk: anchor.web3.PublicKey,
  nonce: number,
  owner: anchor.web3.PublicKey | null = null,
  signer: anchor.web3.Keypair | null = null,
  instructions: anchor.web3.TransactionInstruction[] | undefined = undefined,
) {
  await PROGRAM.rpc.createUserSettingsAccount(
    new anchor.BN(nonce),
    {
      accounts: {
        owner: owner || PROGRAM.provider.wallet.publicKey,
        settingsAccount: pk,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [signer || PROGRAM.provider.wallet.keypair],
      instructions: instructions,
    }
  );
}

async function _findSettingsProgramAddress(
  publicKey: anchor.web3.PublicKey | null = null
): Promise<[anchor.web3.PublicKey, number]> {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      publicKey || PROGRAM.provider.wallet.publicKey.toBuffer(),
      'settings_account',
    ],
    PROGRAM.programId,
  );
}

describe('test create_user_settings_account', () => {
  let settingspk: anchor.web3.PublicKey;
  let nonce: number;
  it('creates a settings account for the user', async () => {
    const [_settingspk, _nonce] = await _findSettingsProgramAddress();
    settingspk = _settingspk;
    nonce = _nonce;

    await _createUserSettingsAccount(settingspk, nonce);
    const settingsAccount = await PROGRAM.account.settingsAccount.fetch(settingspk);
    assert.ok(
      settingsAccount.owner.toString() === 
      PROGRAM.provider.wallet.publicKey.toString()
    );
    assert.ok(settingsAccount.threads.length === 0);
  });

  it('should fail to create a settings account a second time for the user', async () => {
    chai
      .expect(_createUserSettingsAccount(settingspk, nonce))
      .to.eventually.be.rejectedWith(Error);
  });

  it('should fail to create a settings account for the wrong user', async () => {
    const newkp = anchor.web3.Keypair.generate(); // new user
    const [settingspk, nonce] = await _findSettingsProgramAddress(); // derived for old user
    chai.expect(
      _createUserSettingsAccount(
        settingspk,
        nonce,
        newkp.publicKey,
        newkp,
        [await PROGRAM.account.settingsAccount.createInstruction(newkp)],
      )
    ).to.eventually.be.rejectedWith(Error);  // 0x92 (A seeds constraint was violated)
  });
});

describe('test create_settings_account', () => {
});