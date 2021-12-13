import { expect } from 'chai';
import { ecdhDecrypt, ecdhEncrypt, generateEd25519KeyPair } from './ecdh-encryption';
import { randomBytes } from 'tweetnacl';

describe('ECDH encryptor/decryptor test', async () => {

  it('should be possible to decrypt using his the same keypair as was used in encryption', () => {
    // given
    const unencrypted = randomBytes(10);
    const nonce = randomBytes(24);
    const party1KeyPair = generateEd25519KeyPair();
    const party2KeyPair = generateEd25519KeyPair();
    const encrypted = ecdhEncrypt(
      unencrypted,
      party1KeyPair,
      party2KeyPair.publicKey,
      nonce,
    );
    // when
    const decrypted = ecdhDecrypt(
      encrypted,
      party1KeyPair,
      party2KeyPair.publicKey,
      nonce,
    );
    // then
    expect(unencrypted).to.not.deep.eq(encrypted);
    expect(decrypted).to.deep.eq(unencrypted);
  });

  it('should be possible to decrypt using other party keypair', () => {
    // given
    const unencrypted = randomBytes(10);
    const nonce = randomBytes(24);
    const party1KeyPair = generateEd25519KeyPair();
    const party2KeyPair = generateEd25519KeyPair();
    const encrypted = ecdhEncrypt(
      unencrypted,
      party1KeyPair,
      party2KeyPair.publicKey,
      nonce,
    );
    // when
    const decrypted = ecdhDecrypt(
      encrypted,
      party2KeyPair,
      party1KeyPair.publicKey,
      nonce,
    );
    // then
    expect(unencrypted).to.not.deep.eq(encrypted);
    expect(decrypted).to.deep.eq(unencrypted);
  });
});
